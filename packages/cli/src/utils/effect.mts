import fs from "node:fs";
import path from "node:path";

import { type EnvFiles, LiqvidConfig } from "@liqvid/schemas/effect";
import { Effect, FileSystem, type PlatformError, Schema } from "effect";

import { FileDecodeError } from "../errors.mts";
import { CONFIG_FILE } from "../tasks/conventions.mts";

/**
 * Load all environment files (.env, .env.development, .env.production).
 */
export function loadEnvFiles(rootDir: string): EnvFiles {
  return {
    development: parseEnvFile(path.join(rootDir, ".env.development")),
    local: parseEnvFile(path.join(rootDir, ".env.local")),
    production: parseEnvFile(path.join(rootDir, ".env.production")),
  };
}

/**
 * Load and parse liqvid.json.
 */
export function loadLiqvidConfig({
  configPath = path.join(process.cwd(), CONFIG_FILE),
}: {
  configPath?: string;
} = {}) {
  // TODO: should not have to specify this
  return loadJsonEffect(LiqvidConfig, configPath) as Effect.Effect<
    LiqvidConfig,
    FileDecodeError | PlatformError.PlatformError,
    EnvFiles
  >;
}

/**
 * Load a file and decode its JSON contents with the given schema.
 *
 * The schema's decoding service requirements (`Codec.DecodingServices`) are
 * threaded through to the returned effect, so schemas that depend on services
 * (e.g. `EnvFiles`) surface those requirements to the caller instead of being
 * erased to `unknown`.
 */
export function loadJsonEffect<S extends Schema.Top>(
  parser: S,
  filename: string,
): Effect.Effect<
  S["Type"],
  FileDecodeError | PlatformError.PlatformError,
  FileSystem.FileSystem | Schema.Codec.DecodingServices<S>
> {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const file = yield* fs.readFileString(filename, "utf8");

    return yield* Schema.decodeEffect(Schema.fromJsonString(parser), {
      onExcessProperty: "ignore",
    })(file).pipe(
      Effect.mapError((cause) => new FileDecodeError({ cause, filename })),
    );
  });
}

/**
 * Parse a .env file and return key-value pairs.
 */
function parseEnvFile(filePath: string): Record<string, string> {
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
