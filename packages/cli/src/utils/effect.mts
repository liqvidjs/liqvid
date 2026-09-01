import fs from "node:fs";
import path from "node:path";

import { type EnvFiles, LiqvidConfig } from "@liqvid/schemas";
import {
  Cause,
  Effect,
  FileSystem,
  type Layer,
  type PlatformError,
  Schema,
} from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  type AbsolutePath,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import { JSONC } from "jsonc.min";

import { CONFIG_FILE, CONFIG_FILE_JSONC } from "#_/tasks/conventions.mjs";

import { FileDecodeError } from "../errors.mts";

/**
 * Get the file-system layer appropriate to the execution environment (Node, Bun, etc.)
 */
export async function agnosticFileSystem(): Promise<{
  layer: Layer.Layer<FileSystem.FileSystem>;
}> {
  if (process.versions.bun) {
    const mod = await import("@effect/platform-bun");
    return mod.BunFileSystem;
  }

  const mod = await import("@effect/platform-node");
  return mod.NodeFileSystem;
}

/**
 * Load all environment files (.env, .env.development, .env.production).
 */
export function loadEnvFiles(rootDir: AbsoluteDir): EnvFiles {
  return {
    development: parseEnvFile(
      path.join(rootDir, RelativeFile(".env.development")),
    ),
    local: parseEnvFile(path.join(rootDir, RelativeFile(".env.local"))),
    production: parseEnvFile(
      path.join(rootDir, RelativeFile(".env.production")),
    ),
  };
}

/**
 * Resolve the config file path, checking for liqvid.jsonc first, then liqvid.json.
 * Returns the path to the first file that exists, or the .jsonc path if neither exists
 * (so the error message refers to the preferred format).
 */
export const resolveConfigPath = Effect.fn("resolveConfigPath")(function* ({
  cwd = process.cwd(),
}: {
  cwd?: AbsoluteDir;
} = {}) {
  const fs = yield* FileSystem.FileSystem;
  const jsoncPath = path.join(cwd, CONFIG_FILE_JSONC);
  const jsonPath = path.join(cwd, CONFIG_FILE);

  // Check for .jsonc first
  const jsoncExists = yield* fs.exists(jsoncPath);
  if (jsoncExists) {
    return jsoncPath;
  }

  // Fall back to .json
  const jsonExists = yield* fs.exists(jsonPath);
  if (jsonExists) {
    return jsonPath;
  }

  // Neither exists, return .jsonc path for error messaging
  return jsoncPath;
});

/**
 * Load and parse liqvid.jsonc or liqvid.json (checked in that order).
 */
export const loadLiqvidConfig = Effect.fn("loadLiqvidConfig")(
  function* ({ configPath }: { configPath?: AbsoluteFile } = {}) {
    const resolvedPath = configPath ?? (yield* resolveConfigPath());
    return yield* loadJsonc(LiqvidConfig, resolvedPath);
  },
  (effect) =>
    effect.pipe(
      // Correct v4 API to capture full runtime failure traces
      Effect.catchCause((cause) => {
        // Look through the flattened reasons array in Effect v4
        const failReason = cause.reasons.find(Cause.isFailReason);

        if (failReason && failReason.error._tag === "FileDecodeError") {
          // TODO: should not have to specify this
          return Effect.fail<
            string | FileDecodeError | PlatformError.PlatformError
          >(
            `The Liqvid configuration file is invalid:\n${Cause.pretty(cause)}`,
          );
        }

        // Safely bubble unmatched exceptions or defects back up the stack
        return Effect.failCause(cause);
      }),
      Effect.catchReason("PlatformError", "NotFound", () =>
        Effect.fail(
          `Liqvid config file not found. Please create a ${CONFIG_FILE_JSONC} or ${CONFIG_FILE} file in the root of your project.`,
        ),
      ),
    ) as Effect.Effect<
      LiqvidConfig,
      string | FileDecodeError | PlatformError.PlatformError,
      EnvFiles | FileSystem.FileSystem
    >,
);

/**
 * Load a file and decode its JSON contents with the given schema.
 *
 * The schema's decoding service requirements (`Codec.DecodingServices`) are
 * threaded through to the returned effect, so schemas that depend on services
 * (e.g. `EnvFiles`) surface those requirements to the caller instead of being
 * erased to `unknown`.
 */
export const loadJson = Effect.fn("loadJson")(function* <S extends Schema.Top>(
  parser: S,
  filename: AbsoluteFile,
) {
  const fs = yield* FileSystem.FileSystem;

  const file = yield* fs.readFileString(filename, "utf8");

  return yield* Schema.decodeEffect(Schema.fromJsonString(parser), {
    onExcessProperty: "ignore",
  })(file).pipe(
    Effect.mapError((cause) => new FileDecodeError({ cause, filename })),
  );
});

/**
 * Load a file (supporting JSONC format with comments) and decode its contents
 * with the given schema.
 *
 * Uses jsonc.min to strip comments before parsing.
 */
export const loadJsonc = Effect.fn("loadJsonc")(function* <
  S extends Schema.Top,
>(parser: S, filename: AbsoluteFile) {
  const fs = yield* FileSystem.FileSystem;

  const file = yield* fs.readFileString(filename, "utf8");
  const minified = JSONC.minify(file);

  return yield* Schema.decodeEffect(Schema.fromJsonString(parser), {
    onExcessProperty: "ignore",
  })(minified).pipe(
    Effect.mapError((cause) => new FileDecodeError({ cause, filename })),
  );
});

/**
 * Parse a .env file and return key-value pairs.
 */
function parseEnvFile(filePath: AbsolutePath): Record<string, string> {
  const result: Record<string, string> = {};

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();

      // Remove surrounding quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      result[key] = value;
    }
  } catch {
    // File doesn't exist or can't be read, return empty object
  }

  return result;
}

/** Write JSON data to a file, pretty-printed with 2-space indentation. */
export const writeJSON = Effect.fn("writeJSON")(function* <T>(
  path: AbsoluteFile,
  data: T,
) {
  const fs = yield* FileSystem.FileSystem;
  const jsonString = JSON.stringify(data, null, 2);
  yield* fs.writeFileString(path, jsonString);
});

/** go up one directory */
export const UP = RelativeDir("..");
