import { createWriteStream } from "node:fs";
import * as nodeFs from "node:fs/promises";
import * as http from "node:http";
import * as path from "node:path";

import { runNextBuild } from "@liqvid/cli/build";
import { Cause, Effect, FileSystem } from "effect";
import {
  type AbsoluteDir,
  RelativeDir,
  RelativeFile,
  type RelativePath,
} from "effect-paths";
import handler from "serve-handler";

import { BUILD_DIR, PREVIEW_DIR, ROOT_HIDDEN_DIR } from "#_/conventions";
import {
  getConfigSync,
  getServerState,
  type LiqvidServerState,
} from "#_/initialize";

export const startPreviewServer = Effect.fnUntraced(
  function* (state: LiqvidServerState) {
    const { cwd } = state;
    const config = getConfigSync();
    const previewDir = path.join(cwd, ROOT_HIDDEN_DIR, PREVIEW_DIR);

    const fs = yield* FileSystem.FileSystem;

    const outDir = path.join(cwd, BUILD_DIR);

    // Check if the build output exists, if not run 'next build' before setting
    // up the preview directory and its symlinks.
    if (!(yield* fs.exists(outDir))) {
      yield* Effect.log("'out' directory not found, running 'next build'...");
      yield* runNextBuild({ cwd });
    }
    if (!(yield* fs.exists(outDir))) {
      return yield* Effect.fail(
        new Error(`'next build' completed without creating ${outDir}`),
      );
    }

    const logDir = path.join(cwd, RelativeDir(config.logging?.dir ?? "logs"));
    const logFile = path.join(logDir, RelativeFile("preview-server.log"));
    // Setup symlinks for basePath if configured
    yield* setupPreviewSymlinks(previewDir, state.basePath);

    // Start the preview server
    const { hostname, port } = config.previewServer;

    yield* fs.makeDirectory(logDir, { recursive: true });

    const logStream = createWriteStream(logFile, { flags: "a" });
    logStream.on("error", (error) => {
      console.error("[preview server] Failed to write log file:", error);
    });
    yield* Effect.tryPromise({
      catch: (error) =>
        error instanceof Error ? error : new Error(String(error)),
      try: () =>
        new Promise<void>((resolve, reject) => {
          logStream.once("open", () => resolve());
          logStream.once("error", reject);
        }),
    });

    const writeLog = (message: string) => {
      logStream.write(`${new Date().toISOString()} ${message}\n`);
    };

    const server = http.createServer((request, response) => {
      const requestPath = request.url?.split("?")[0] ?? "/";
      response.once("finish", () => {
        writeLog(
          `${request.method ?? "UNKNOWN"} ${requestPath} ${response.statusCode}`,
        );
      });
      const logRequestError = (error: unknown) => {
        const detail =
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error);
        writeLog(
          `ERROR Failed to serve ${request.method} ${requestPath}: ${detail.replace(/\s+/g, " ")}`,
        );
        console.error(
          `[preview server] Failed to serve ${request.method} ${requestPath}:`,
          error,
        );

        if (response.headersSent) {
          response.destroy(error instanceof Error ? error : undefined);
        } else {
          response.statusCode = 500;
          response.end("Internal Server Error");
        }
      };

      try {
        void Promise.resolve(
          handler(request, response, {
            headers: [
              {
                headers: [
                  {
                    key: "Cross-Origin-Embedder-Policy",
                    value: "credentialless",
                  },
                  {
                    key: "Cross-Origin-Opener-Policy",
                    value: "same-origin",
                  },
                  {
                    key: "Cross-Origin-Resource-Policy",
                    value: "cross-origin",
                  },
                ],
                source: "**",
              },
            ],
            public: previewDir,
            trailingSlash: true,
          }),
        ).catch(logRequestError);
      } catch (error) {
        logRequestError(error);
      }
    });

    server.on("error", (error) => {
      writeLog(`ERROR Server error: ${error.stack ?? error.message}`);
      console.error("[preview server] Server error:", error);
    });

    yield* Effect.tryPromise({
      catch: (error) => {
        logStream.end();
        return error instanceof Error ? error : new Error(String(error));
      },
      try: () =>
        new Promise<void>((resolve, reject) => {
          const onError = (error: Error) => reject(error);
          server.once("error", onError);
          server.listen(port, hostname, () => {
            server.off("error", onError);
            resolve();
          });
        }),
    });

    writeLog(`Preview server running on http://${hostname}:${port}...`);
    yield* Effect.log(
      `Preview server running on http://${hostname}:${port}...`,
    );

    // The preview server runs for the lifetime of the process. Keep the
    // effect (and thus the service) alive, tearing the server down if the
    // fiber is interrupted.
    return yield* Effect.never.pipe(
      Effect.ensuring(
        Effect.sync(() =>
          server.close(() => {
            logStream.end();
          }),
        ),
      ),
    );
  },
  (effect) =>
    effect.pipe(
      Effect.tapCause((cause) =>
        Effect.logError(`[preview server] ${Cause.pretty(cause)}`),
      ),
    ),
);

/**
 * Setup symlinks in the preview directory to support basePath.
 * For example, if basePath is "/videos", creates .liqvid/preview/videos -> ../../out
 */
const setupPreviewSymlinks = Effect.fnUntraced(function* (
  previewDir: AbsoluteDir,
  basePath: string,
) {
  const fs = yield* FileSystem.FileSystem;
  const { cwd } = getServerState();
  // Ensure preview directory exists
  yield* fs.makeDirectory(previewDir, { recursive: true });

  // Clean up any existing symlinks in preview directory (except 'out' itself)
  const entries = yield* fs.readDirectory(previewDir);
  for (const name of entries) {
    const entryPath = path.join(previewDir, name as RelativePath);
    // Use lstat so dangling symlinks are recognized instead of following
    // their missing targets and failing with ENOENT.
    const stats = yield* Effect.tryPromise({
      catch: (error) =>
        error instanceof Error ? error : new Error(String(error)),
      try: () => nodeFs.lstat(entryPath),
    });
    if (stats.isSymbolicLink()) {
      yield* fs.remove(entryPath);
    }
  }

  if (!basePath) {
    // No basePath configured, symlink preview directly to out
    const outPath = path.join(cwd, BUILD_DIR);

    if (yield* fs.exists(outPath)) {
      // Copy/symlink contents from out to preview
      const outEntries = yield* fs.readDirectory(outPath);
      for (const basename of outEntries) {
        const srcPath = path.join(outPath, basename as RelativePath);
        const destPath = path.join(previewDir, basename as RelativePath);

        // Remove existing if present
        if (yield* fs.exists(destPath)) {
          yield* fs.remove(destPath, { recursive: true });
        }

        // Create symlink
        yield* fs.symlink(srcPath, destPath);
      }
    }

    return;
  }

  // basePath is configured (e.g., "/videos")
  // Create symlink: .liqvid/preview/videos -> ../../out
  const normalizedBasePath = RelativeDir(basePath.replace(/^\/+/, "")); // Remove leading slashes
  const symlinkPath = path.join(previewDir, normalizedBasePath);

  // Ensure parent directories exist
  yield* fs.makeDirectory(path.dirname(symlinkPath), { recursive: true });

  // Calculate relative path from symlink location to 'out' directory
  const outPath = path.join(cwd, BUILD_DIR);
  const relativePath = path.relative(path.dirname(symlinkPath), outPath);

  // Remove existing symlink/directory if present
  if (yield* fs.exists(symlinkPath)) {
    yield* fs.remove(symlinkPath, { recursive: true });
  }

  // Create symlink
  if (yield* fs.exists(outPath)) {
    yield* fs.symlink(relativePath, symlinkPath);
    yield* Effect.log(`Created symlink: ${symlinkPath} -> ${relativePath}`);
  }
});
