import { NodeFileSystem } from "@effect/platform-node";
import type { ScreenshotOptions } from "@liqvid/renderer/screenshot";
import { Console, Effect, Exit, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteFile } from "effect-paths";

import { defaultCliProgressLayer } from "../utils/progress.mts";

/**
 * Result of screenshot capture.
 */
export interface ScreenshotResult {
  /** Height of the screenshot */
  height: number;
  /** Path to the saved screenshot */
  path: AbsoluteFile;

  /** Width of the screenshot */
  width: number;
}

/**
 * Capture a screenshot from a Liqvid video.
 *
 * @example
 * ```ts
 * import { screenshot } from "@liqvid/cli/screenshot";
 *
 * await screenshot({
 *   url: "http://localhost:3000/projects/my-video",
 *   output: "./screenshot.png",
 *   time: 5,
 *   width: 1280,
 *   height: 720,
 * });
 * ```
 */
export const screenshot = Effect.fnUntraced(function* (
  options: ScreenshotOptions,
) {
  const { screenshot: renderScreenshot } = yield* Effect.promise(
    () => import("@liqvid/renderer/screenshot"),
  );

  // TODO: load screenshot configuration from config file here

  return yield* renderScreenshot(options);
});

/** Capture a screenshot. */
export const screenshotCommand = Command.make(
  "screenshot",
  {
    browserExecutable: Flag.String("browser-executable").pipe(
      Flag.withAlias("x"),
      Flag.withDescription(
        "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
      ),
      Flag.optional,
    ),
    colorScheme: Flag.Literals("color-scheme", ["light", "dark"]).pipe(
      Flag.withDescription("Color scheme"),
      Flag.withDefault("light" as const),
    ),
    height: Flag.Int("height").pipe(
      Flag.withAlias("h"),
      Flag.withDescription("Screenshot height"),
      Flag.withDefault(720),
    ),
    imageFormat: Flag.Literals("image-format", ["jpeg", "png"]).pipe(
      Flag.withAlias("F"),
      Flag.withDescription("Image format for screenshot"),
      Flag.withDefault("png" as const),
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withDescription("Output filename"),
      Flag.withDefault("./screenshot.png"),
    ),
    quality: Flag.Int("quality").pipe(
      Flag.withAlias("q"),
      Flag.withDescription(
        'Quality for images. Only applies when --image-format is "jpeg"',
      ),
      Flag.withDefault(80),
    ),
    time: Flag.Finite("time").pipe(
      Flag.withAlias("t"),
      Flag.withDescription("Time in seconds to capture"),
      Flag.withDefault(0),
    ),
    url: Flag.String("url").pipe(
      Flag.withAlias("u"),
      Flag.withDescription("URL of video to capture"),
      Flag.optional,
    ),
    width: Flag.Int("width").pipe(
      Flag.withAlias("w"),
      Flag.withDescription("Screenshot width"),
      Flag.withDefault(1280),
    ),
  },
  (argv) =>
    Effect.gen(function* () {
      const { screenshot: renderScreenshot } = yield* Effect.promise(
        () => import("@liqvid/renderer/screenshot"),
      );
      const exit = yield* Effect.exit(
        renderScreenshot({
          browserExecutable: Option.getOrUndefined(
            argv.browserExecutable,
          ) as AbsoluteFile,
          colorScheme: argv.colorScheme,
          height: argv.height,
          imageFormat: argv.imageFormat,
          output: argv.output,
          quality: argv.quality,
          time: argv.time,
          url: Option.getOrUndefined(argv.url) as string,
          width: argv.width,
        } as ScreenshotOptions).pipe(
          Effect.provide(NodeFileSystem.layer),
          Effect.tapError(Console.error),
          Effect.provide(defaultCliProgressLayer()),
        ),
      );

      if (Exit.isFailure(exit)) {
        process.exit(1);
      }

      process.exit(0);
    }),
).pipe(Command.withDescription("Capture a screenshot from a Liqvid video"));
