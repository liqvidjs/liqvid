import * as http from "node:http";
import * as path from "node:path";

import { runNextBuild } from "@liqvid/cli/build";
import { loadEnvFiles, loadLiqvidConfig } from "@liqvid/cli/utils";
import { Effect, FileSystem } from "effect";
import { type AbsoluteDir, RelativeDir, type RelativePath } from "effect-paths";
import handler from "serve-handler";

import { BUILD_DIR, PREVIEW_DIR, ROOT_HIDDEN_DIR } from "#_/conventions.mjs";
import { getServerState, type LiqvidServerState } from "#_/initialize.mjs";
import { readDirWithFileTypes } from "#_/utils/effect.mjs";

export const DEFAULT_PRODUCTION_SERVER_PORT = 4000;

export const startProductionServer = Effect.fnUntraced(function* (
  state: LiqvidServerState,
) {
  const { cwd } = state;
  const previewDir = path.join(cwd, ROOT_HIDDEN_DIR, PREVIEW_DIR);

  const fs = yield* FileSystem.FileSystem;

  // Check if 'out' directory exists, if not run 'next build'
  if (!(yield* fs.exists(previewDir))) {
    yield* Effect.log("'out' directory not found, running 'next build'...");
    yield* runNextBuild({ cwd });
  }

  // Parse environment files
  const envFiles = loadEnvFiles(cwd);

  // Load liqvid.jsonc or liqvid.json config
  const config = yield* loadLiqvidConfig();
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

  yield* Effect.callback<void>((resume) => {
    server.listen(port, () => {
      resume(Effect.void);
    });
  });

  yield* Effect.log(`Production server running on port ${port}...`);

  // The production server runs for the lifetime of the process. Keep the
  // effect (and thus the service) alive, tearing the server down if the
  // fiber is interrupted.
  return yield* Effect.never.pipe(
    Effect.ensuring(Effect.sync(() => server.close())),
  );
});

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
  const entries = yield* readDirWithFileTypes(previewDir);
  for (const [name, kind] of entries) {
    if (kind === "SymbolicLink") {
      yield* fs.remove(path.join(previewDir, name));
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
