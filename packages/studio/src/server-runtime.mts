import { NodeFileSystem } from "@effect/platform-node";
import { Effect, Layer, Logger, ManagedRuntime, References } from "effect";

import { getLogLevel } from "#_/utils/misc.mjs";

/**
 * Layer providing the services every server-side Effect needs:
 * Node filesystem and a pretty-printed console logger.
 */
export const ServerLayer = Layer.mergeAll(
  NodeFileSystem.layer,
  Logger.layer([Logger.consolePretty()]),
);

/**
 * Shared server-side runtime. Built once, reused for every ad-hoc Effect
 * execution on the server (outside of the HttpApi handler, which builds its
 * own runtime via `toWebHandler`).
 *
 * `References.MinimumLogLevel` is **not** baked in — it is applied dynamically
 * per-invocation via {@link withLogLevel} so that config changes take effect
 * without a server restart.
 */
export const serverRuntime = ManagedRuntime.make(ServerLayer);

/**
 * Apply the current dynamic log level to an effect before running it.
 *
 * `References.MinimumLogLevel` is a `Context.Reference` with a static default,
 * so we must snapshot the current configured level at call time rather than
 * baking it into the layer.
 */
export function withLogLevel<A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> {
  return Effect.provideService(
    effect,
    References.MinimumLogLevel,
    getLogLevel(),
  );
}
