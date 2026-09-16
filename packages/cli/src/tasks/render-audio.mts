import { Effect, Exit, Option } from "effect";
import { Command, Flag } from "effect/unstable/cli";
import type { AbsoluteFile } from "effect-paths";

import { agnosticFileSystem } from "../utils.mts";

/**
 * Options for rendering audio.
 */
export interface RenderAudioOptions {
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: AbsoluteFile;

  /** Output filename */
  output: AbsoluteFile;

  /** URL of video to render audio for */
  url: string;
}

/**
 * Render the audio track of a Liqvid video to a WAV file.
 *
 * @example
 * ```ts
 * import { renderAudio } from "@liqvid/cli/render-audio";
 *
 * await renderAudio({
 *   url: "http://localhost:3000/projects/my-video",
 *   output: "./audio.wav",
 * });
 * ```
 */
export const renderAudio = Effect.fnUntraced(function* (
  options: RenderAudioOptions,
) {
  const { renderAudio: renderAudioTask } = yield* Effect.promise(
    () => import("@liqvid/renderer/render-audio"),
  );

  return yield* renderAudioTask({
    browserExecutable: options.browserExecutable,
    output: options.output,
    url: options.url,
  });
});

/** Render audio to WAV file. */
export const renderAudioCommand = Command.make(
  "render-audio",
  {
    browserExecutable: Flag.String("browser-executable").pipe(
      Flag.withAlias("x"),
      Flag.withDescription(
        "Path to a Chrome/ium executable. If not specified and a suitable executable cannot be found, one will be downloaded during rendering.",
      ),
      Flag.optional,
    ),
    output: Flag.String("output").pipe(
      Flag.withAlias("o"),
      Flag.withDescription("Output filename"),
      Flag.withDefault("./audio.wav"),
    ),
    url: Flag.String("url").pipe(
      Flag.withAlias("u"),
      Flag.withDescription("URL of video to render audio for"),
      Flag.optional,
    ),
  },
  (argv) =>
    Effect.gen(function* () {
      const { renderAudio: renderAudioTask } = yield* Effect.promise(
        () => import("@liqvid/renderer/render-audio"),
      );
      const exit = yield* Effect.exit(
        renderAudioTask({
          browserExecutable: Option.getOrUndefined(
            argv.browserExecutable,
          ) as AbsoluteFile,
          output: argv.output as AbsoluteFile,
          url: Option.getOrUndefined(argv.url) as string,
        }).pipe(
          Effect.provide((yield* Effect.promise(agnosticFileSystem)).layer),
        ),
      );

      if (Exit.isFailure(exit)) {
        console.error(exit.cause);
        process.exit(1);
      }

      process.exit(0);
    }),
).pipe(Command.withDescription("Render audio to a WAV file"));
