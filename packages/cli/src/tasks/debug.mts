import { Effect, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteFile } from "effect-paths";

/**
 * Options for the debug command.
 */
export interface DebugOptions {
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: AbsoluteFile;

  /** URL to open */
  url: string;
}

/**
 * Open the given URL in a visible (non-headless) Puppeteer browser.
 *
 * @example
 * ```ts
 * import { debug } from "@liqvid/cli/debug";
 *
 * await debug({ url: "http://localhost:3000/projects/my-video" });
 * ```
 */
export async function debug(options: DebugOptions): Promise<void> {
  const { debug: openDebug } = await import("@liqvid/renderer/debug");

  await openDebug({
    browserExecutable: options.browserExecutable,
    url: options.url,
  });
}

/** Open a URL in a visible browser for debugging. */
export const debugCommand = Command.make(
  "debug",
  {
    browserExecutable: Flag.String("browser-executable").pipe(
      Flag.withAlias("x"),
      Flag.withDescription(
        "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
      ),
      Flag.optional,
    ),
    url: Flag.String("url").pipe(
      Flag.withAlias("u"),
      Flag.withDescription("URL to open"),
    ),
  },
  ({ browserExecutable, url }) =>
    Effect.gen(function* () {
      const { debug: openDebug } = yield* Effect.promise(
        () => import("@liqvid/renderer/debug"),
      );
      yield* Effect.promise(() =>
        openDebug({
          browserExecutable: Option.getOrUndefined(browserExecutable) as
            | AbsoluteFile
            | undefined,
          url,
        }),
      );
      process.exit(0);
    }),
).pipe(
  Command.withDescription("Open a URL in a visible browser for debugging"),
);
