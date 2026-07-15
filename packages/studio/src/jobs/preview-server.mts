import * as http from "node:http";
import * as path from "node:path";

import { runNextBuild } from "@liqvid/cli/build";
import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { Effect, FileSystem } from "effect";
import handler from "serve-handler";

import { ASSETS_DIR, CONFIG_FILE } from "../conventions.mts";
import { getServerState, type LiqvidServerState } from "../initialize.mts";
import { readDirWithFileTypes } from "../utils/effect.mts";

export const DEFAULT_PRODUCTION_SERVER_PORT = 4000;

export function startProductionServer(state: LiqvidServerState) {
  return Effect.gen(function* () {
    const { cwd } = state;
    const previewDir = path.join(cwd, ASSETS_DIR, "preview");

    const fs = yield* FileSystem.FileSystem;

    // Check if 'out' directory exists, if not run 'next build'
    if (!(yield* fs.exists(previewDir))) {
      yield* Effect.log("'out' directory not found, running 'next build'...");
      yield* runNextBuild({ cwd });
    }

    // Parse environment files
    const envFiles = loadEnvFiles(cwd);

    // Load liqvid.json config
    const config = yield* loadLiqvidConfig({
      configPath: path.join(cwd, CONFIG_FILE),
    });
    const basePath = config?.basePath ?? "";
    state.basePath = basePath;

    // Setup symlinks for basePath if configured
    yield* setupPreviewSymlinks(previewDir, basePath);

    // Start the production server
    const port =
      Number(
        getEnvVar("LIQVID_PRODUCTION_SERVER_PORT", envFiles.production, {}),
      ) || DEFAULT_PRODUCTION_SERVER_PORT;
    state.productionServerPort = port;

    const server = http.createServer((request, response) => {
      return handler(request, response, {
        headers: [
          {
            headers: [
              { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
              { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
              { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
            ],
            source: "**",
          },
        ],
        public: previewDir,
        trailingSlash: true,
      });
    });

    server.listen(port, () => {
      console.log(`Production server running on port ${port}...`);
    });
  });
}

/**
 * Setup symlinks in the preview directory to support basePath.
 * For example, if basePath is "/videos", creates .liqvid/preview/videos -> ../../out
 */
function setupPreviewSymlinks(previewDir: string, basePath: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const { cwd } = getServerState();
    // Ensure preview directory exists
    yield* fs.makeDirectory(previewDir, { recursive: true });

    // Clean up any existing symlinks in preview directory (except 'out' itself)
    const entries = yield* readDirWithFileTypes(previewDir);
    for (const [name, stats] of entries) {
      if (stats.type === "SymbolicLink") {
        yield* fs.remove(path.join(previewDir, name));
      }
    }

    if (!basePath) {
      // No basePath configured, symlink preview directly to out
      const outPath = path.join(cwd, "out");
      if (yield* fs.exists(outPath)) {
        // Copy/symlink contents from out to preview
        const outEntries = yield* fs.readDirectory(outPath);
        for (const basename of outEntries) {
          const srcPath = path.join(outPath, basename);
          const destPath = path.join(previewDir, basename);

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
    const normalizedBasePath = basePath.replace(/^\/+/, ""); // Remove leading slashes
    const symlinkPath = path.join(previewDir, normalizedBasePath);

    // Ensure parent directories exist
    yield* fs.makeDirectory(path.dirname(symlinkPath), { recursive: true });

    // Calculate relative path from symlink location to 'out' directory
    const outPath = path.join(cwd, "out");
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
}

/**
 * Get an environment variable, first checking the env file, then process.env.
 */
function getEnvVar(
  name: string,
  envFile: Record<string, string>,
  _envFiles: Record<string, unknown>,
): string | undefined {
  return envFile[name] ?? process.env[name];
}
