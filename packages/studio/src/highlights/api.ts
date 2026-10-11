import { Effect, Exit } from "effect";
import type { RelativeDir } from "effect-paths";

import type { HighlightEntry } from "#_/api/schemas";
import { clientRuntime, LiqvidStudioApiClient } from "#_/client";

/** A highlight as passed around the client. */
export type Highlight = HighlightEntry;

export interface HighlightsApiOptions {
  /** Parameter values for parameterized projects */
  params?: Record<string, string>;

  /** Path to the project */
  projectPath: RelativeDir;
}

/**
 * Load a project's highlights.
 * Returns `undefined` if the request failed.
 */
export async function loadHighlights(
  opts: HighlightsApiOptions,
): Promise<readonly Highlight[] | undefined> {
  const exit = await clientRuntime.runPromiseExit(
    Effect.gen(function* () {
      const client = yield* LiqvidStudioApiClient;

      return yield* client.highlights.list({
        query: {
          params: JSON.stringify(opts.params ?? {}),
          projectPath: opts.projectPath,
        },
      });
    }),
  );

  return Exit.isSuccess(exit) ? exit.value.highlights : undefined;
}

/**
 * Store a project's highlights.
 * Returns whether the request succeeded.
 */
export async function storeHighlights(
  highlights: readonly Highlight[],
  opts: HighlightsApiOptions,
): Promise<boolean> {
  const exit = await clientRuntime.runPromiseExit(
    Effect.gen(function* () {
      const client = yield* LiqvidStudioApiClient;

      return yield* client.highlights.save({
        payload: { highlights: [...highlights] },
        query: {
          params: JSON.stringify(opts.params ?? {}),
          projectPath: opts.projectPath,
        },
      });
    }),
  );

  return Exit.isSuccess(exit);
}
