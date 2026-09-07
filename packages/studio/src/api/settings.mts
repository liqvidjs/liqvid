import { CONFIG_FILE_JSONC, resolveConfigPath } from "@liqvid/cli/utils";
import type { Locale } from "@liqvid/schemas";
import * as commentJson from "comment-json";
import { Effect, FileSystem, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import type { AbsoluteFile } from "effect-paths";
import { JSONC } from "jsonc.min";

import { getServerState } from "#_/initialize.mjs";
import { getLocale } from "#_/utils/i18n.mjs";

import { SettingsConfig, WebApi } from "./contract.mts";

/** Shape of the raw `liqvid.json(c)`, with an optional `ui.locale` field. */
type RawConfig = {
  ui?: { locale?: Locale } & Record<string, unknown>;
} & Record<string, unknown>;

/**
 * Read the raw config file (`liqvid.jsonc` or `liqvid.json`) as an object,
 * preserving all existing fields.
 *
 * We deliberately avoid decoding through the config schema here so that
 * writing the file back does not inject schema defaults into the user's config.
 *
 * Uses jsonc.min to strip comments for parsing.
 */
const readRawConfig = Effect.fnUntraced(function* (configPath: AbsoluteFile) {
  const fs = yield* FileSystem.FileSystem;
  const contents = yield* fs.readFileString(configPath, "utf8");
  const minified = JSONC.minify(contents);
  return JSON.parse(minified) as RawConfig;
});

/**
 * Read the raw config file preserving comments (for write-back).
 * Uses comment-json to parse while retaining comment structure.
 */
const readRawConfigWithComments = Effect.fnUntraced(function* (
  configPath: AbsoluteFile,
) {
  const fs = yield* FileSystem.FileSystem;
  const contents = yield* fs.readFileString(configPath, "utf8");
  return commentJson.parse(contents) as RawConfig;
});

/**
 * Write raw config back to file, preserving comments if writing to .jsonc.
 */
const writeRawConfig = Effect.fnUntraced(function* (
  configPath: AbsoluteFile,
  data: RawConfig,
) {
  const fs = yield* FileSystem.FileSystem;
  const isJsonc = configPath.endsWith(CONFIG_FILE_JSONC);
  const jsonString = isJsonc
    ? commentJson.stringify(data, null, 2)
    : JSON.stringify(data, null, 2);
  yield* fs.writeFileString(configPath, jsonString);
});

const decodeSettings = Schema.decodeUnknownEffect(SettingsConfig);
const encodeSettings = Schema.encodeUnknownEffect(SettingsConfig);

/**
 * Read the editable settings (backend, basePath, media, providers) directly
 * from `liqvid.jsonc` or `liqvid.json`. Shared between the HTTP handler and
 * server components.
 *
 * Requires a {@link FileSystem.FileSystem} in context (e.g. via
 * `NodeFileSystem.layer`).
 */
export const getSettingsConfig = Effect.fnUntraced(function* () {
  const state = getServerState();
  const configPath = yield* resolveConfigPath({ cwd: state.cwd });

  const raw = yield* readRawConfig(configPath);

  return yield* decodeSettings({
    backend: raw.backend,
    basePath: raw.basePath,
    media: raw.media,
    providers: raw.providers,
  });
});

/**
 * Merge validated settings into the raw config object, pruning fields that
 * are absent from the incoming payload so the UI can clear them.
 */
function applySettings(raw: RawConfig, settings: SettingsConfig): RawConfig {
  const next: RawConfig = { ...raw };

  // backend
  if (settings.backend === undefined) {
    delete next.backend;
  } else {
    next.backend = settings.backend;
  }

  // basePath
  if (settings.basePath === undefined || settings.basePath === "") {
    delete next.basePath;
  } else {
    next.basePath = settings.basePath;
  }

  // media — merge with any existing media config (captioning/thumbnails), only
  // touching the `audio` sub-key that the UI manages.
  const existingMedia =
    typeof next.media === "object" && next.media !== null
      ? (next.media as Record<string, unknown>)
      : {};
  if (settings.media?.audio === undefined) {
    const { audio: _omit, ...restMedia } = existingMedia;
    if (Object.keys(restMedia).length === 0) {
      delete next.media;
    } else {
      next.media = restMedia;
    }
  } else {
    next.media = { ...existingMedia, audio: settings.media.audio };
  }

  // providers
  if (settings.providers === undefined) {
    delete next.providers;
  } else {
    next.providers = settings.providers;
  }

  return next;
}

export const settingsLive = HttpApiBuilder.group(
  WebApi,
  "settings",
  (handlers) =>
    handlers
      .handle("getLocale", () =>
        Effect.sync(() => ({ locale: getLocale() as Locale })),
      )
      .handle(
        "setLocale",
        Effect.fnUntraced(
          function* ({ payload: { locale } }) {
            const state = getServerState();
            const configPath = yield* resolveConfigPath({ cwd: state.cwd });

            // Update the raw config on disk, preserving all other fields and comments.
            const raw = yield* readRawConfigWithComments(configPath);
            raw.ui = { ...raw.ui, locale };
            yield* writeRawConfig(configPath, raw);

            // Update the in-memory config so subsequent renders reflect the change
            // immediately (the config watcher will also pick this up).
            state.config = Option.map(state.config, (config) => ({
              ...config,
              ui: { ...config.ui, locale },
            }));

            return { locale };
          },
          (effect) => effect.pipe(Effect.catchTag("PlatformError", Effect.die)),
        ),
      )
      .handle("getConfig", () =>
        getSettingsConfig().pipe(
          Effect.catchTag("PlatformError", Effect.die),
          Effect.catchTag("SchemaError", Effect.die),
        ),
      )
      .handle(
        "setConfig",
        Effect.fnUntraced(
          function* ({ payload }) {
            const state = getServerState();
            const configPath = yield* resolveConfigPath({ cwd: state.cwd });

            // Read with comments preserved, apply settings, write back.
            const raw = yield* readRawConfigWithComments(configPath);
            const next = applySettings(raw, payload);
            yield* writeRawConfig(configPath, next);

            // Return the persisted (round-tripped) settings so the client can
            // reconcile its local state.
            return yield* encodeSettings(payload);
          },
          (effect) =>
            effect.pipe(
              Effect.catchTag("PlatformError", Effect.die),
              Effect.catchTag("SchemaError", Effect.die),
            ),
        ),
      ),
);
