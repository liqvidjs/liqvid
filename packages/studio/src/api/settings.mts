import path from "node:path";

import { CONFIG_FILE, writeJSON } from "@liqvid/cli/utils";
import type { Locale } from "@liqvid/schemas";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { getServerState } from "../initialize.mts";
import { getLocale } from "../utils/i18n.mts";

import { WebApi } from "./contract.mts";

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
      ),
);
