import path from "node:path";

import { CONFIG_FILE, writeJSON } from "@liqvid/cli/utils";
import type { Locale } from "@liqvid/schemas";
import { Effect, FileSystem, Option, Schema } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { getServerState } from "../initialize.mts";
import { getLocale } from "../utils/i18n.mts";

import { SettingsConfig, WebApi } from "./contract.mts";

/** Shape of the raw `liqvid.json`, with an optional `ui.locale` field. */
type RawConfig = {
  ui?: { locale?: Locale } & Record<string, unknown>;
} & Record<string, unknown>;

/**
 * Read the raw `liqvid.json` as an object, preserving all existing fields.
 *
 * We deliberately avoid decoding through the config schema here so that
 * writing the file back does not inject schema defaults into the user's config.
 */
function readRawConfig(configPath: string) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const contents = yield* fs.readFileString(configPath, "utf8");
    return JSON.parse(contents) as RawConfig;
  });
}

const decodeSettings = Schema.decodeUnknownEffect(SettingsConfig);
const encodeSettings = Schema.encodeUnknownEffect(SettingsConfig);

/**
 * Read the editable settings (backend, basePath, media, providers) directly
 * from `liqvid.json`. Shared between the HTTP handler and server components.
 *
 * Requires a {@link FileSystem.FileSystem} in context (e.g. via
 * `NodeFileSystem.layer`).
 */
export function getSettingsConfig() {
  return Effect.gen(function* () {
    const state = getServerState();
    const configPath = path.join(state.cwd, CONFIG_FILE);

    const raw = yield* readRawConfig(configPath);

    return yield* decodeSettings({
      backend: raw.backend,
      basePath: raw.basePath,
      media: raw.media,
      providers: raw.providers,
    });
  });
}

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
      .handle("setLocale", ({ payload: { locale } }) =>
        Effect.gen(function* () {
          const state = getServerState();
          const configPath = path.join(state.cwd, CONFIG_FILE);

          // Update the raw config on disk, preserving all other fields.
          const raw = yield* readRawConfig(configPath);
          raw.ui = { ...raw.ui, locale };
          yield* writeJSON(configPath, raw);

          // Update the in-memory config so subsequent renders reflect the change
          // immediately (the config watcher will also pick this up).
          state.config = Option.map(state.config, (config) => ({
            ...config,
            ui: { ...config.ui, locale },
          }));

          return { locale };
        }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      )
      .handle("getConfig", () =>
        getSettingsConfig().pipe(
          Effect.catchTag("PlatformError", Effect.die),
          Effect.catchTag("SchemaError", Effect.die),
        ),
      )
      .handle("setConfig", ({ payload }) =>
        Effect.gen(function* () {
          const state = getServerState();
          const configPath = path.join(state.cwd, CONFIG_FILE);

          const raw = yield* readRawConfig(configPath);
          const next = applySettings(raw, payload);
          yield* writeJSON(configPath, next);

          // Return the persisted (round-tripped) settings so the client can
          // reconcile its local state.
          return yield* encodeSettings(payload);
        }).pipe(
          Effect.catchTag("PlatformError", Effect.die),
          Effect.catchTag("SchemaError", Effect.die),
        ),
      ),
);
