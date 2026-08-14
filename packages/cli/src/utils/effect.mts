import fs from "node:fs";
import path from "node:path";

import { type EnvFiles, LiqvidConfig } from "@liqvid/schemas";
import chalk from "chalk";
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

import { FileDecodeError } from "../errors.mts";
import { CONFIG_FILE } from "../tasks/conventions.mts";

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
 * Load and parse liqvid.json.
 */
export function loadLiqvidConfig({
  configPath = path.join(process.cwd(), CONFIG_FILE),
}: {
  configPath?: AbsoluteFile;
} = {}) {
  return (
    loadJson(LiqvidConfig, configPath) as Effect.Effect<
      LiqvidConfig,
      FileDecodeError | PlatformError.PlatformError,
      EnvFiles | FileSystem.FileSystem
    >
  ).pipe(
    // Correct v4 API to capture full runtime failure traces
    Effect.catchCause((cause) => {
      // Look through the flattened reasons array in Effect v4
      const failReason = cause.reasons.find(Cause.isFailReason);

      if (failReason && failReason.error._tag === "FileDecodeError") {
        // TODO: should not have to specify this
        return Effect.fail<
          string | FileDecodeError | PlatformError.PlatformError
        >(
          `The ${CONFIG_FILE} configuration file is invalid:\n${Cause.pretty(cause)}`,
        );
      }

      // Safely bubble unmatched exceptions or defects back up the stack
      return Effect.failCause(cause);
    }),
    Effect.catchReason("PlatformError", "NotFound", () =>
      Effect.fail(
        "Liqvid config file not found. Please create a liqvid.json file in the root of your project.",
      ),
    ),
  );
}

/**
 * Load a file and decode its JSON contents with the given schema.
 *
 * The schema's decoding service requirements (`Codec.DecodingServices`) are
 * threaded through to the returned effect, so schemas that depend on services
 * (e.g. `EnvFiles`) surface those requirements to the caller instead of being
 * erased to `unknown`.
 */
export function loadJson<S extends Schema.Top>(
  parser: S,
  filename: AbsoluteFile,
) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const file = yield* fs.readFileString(filename, "utf8");

    return yield* Schema.decodeEffect(Schema.fromJsonString(parser), {
      onExcessProperty: "ignore",
    })(file).pipe(
      Effect.tapError((cause) =>
        Effect.gen(function* () {
          console.dir(cause);
          console.log(chalk.blue(file));
        }),
      ),
      Effect.mapError((cause) => new FileDecodeError({ cause, filename })),
    );
  });
}

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
export function writeJSON<T>(path: AbsoluteFile, data: T) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const jsonString = JSON.stringify(data, null, 2);
    yield* fs.writeFileString(path, jsonString);
  });
}

/** go up one directory */
export const UP = RelativeDir("..");
