import type { RenderAudioResult } from "@liqvid/renderer/render-audio";
import type { CommandModule } from "yargs";

import { BROWSER_EXECUTABLE, DEFAULT_CONFIG, parseConfig } from "./config.mts";

/**
 * Options for rendering audio.
 */
export interface RenderAudioOptions {
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: string;

  /** Output filename */
  output: string;

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
export async function renderAudio(
  options: RenderAudioOptions,
): Promise<RenderAudioResult> {
  const { renderAudio: renderAudioTask } = await import(
    "@liqvid/renderer/render-audio"
  );

  return renderAudioTask({
    browserExecutable: options.browserExecutable ?? "",
    output: options.output,
    url: options.url,
  });
}

/** Render audio to WAV file. */
export const renderAudioCommand: CommandModule = {
  builder: (yargs) =>
    yargs
      .config("config", parseConfig("renderAudio"))
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid render-audio -u http://localhost:3000 -o audio.wav"],
        ["liqvid render-audio -u http://localhost:8080/dist/"],
      ])
      // Selection
      .group(["output", "url"], "What to render")
      .option("output", {
        alias: "o",
        default: "./audio.wav",
        demandOption: true,
        desc: "Output filename",
        normalize: true,
      })
      .option("url", {
        alias: "u",
        desc: "URL of video to render audio for",
      })
      // General configuration
      .group(["browser-executable", "config", "help"], "General options")
      .option("browser-executable", BROWSER_EXECUTABLE)
      .version(false),
  command: "render-audio",
  describe: "Render audio to a WAV file",
  handler: async (argv) => {
    const { renderAudio: renderAudioTask } = await import(
      "@liqvid/renderer/render-audio"
    );
    // biome-ignore lint/suspicious/noExplicitAny: argv is properly typed by yargs builder
    await renderAudioTask(argv as any);
    process.exit(0);
  },
};
