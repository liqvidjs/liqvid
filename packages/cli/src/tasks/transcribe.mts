import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { Duration } from "@liqvid/duration";
import type {
  WhisperConfig,
  WhisperModelName,
} from "@liqvid/schemas/jobs/captioning";
import { assertType } from "@liqvid/utils";
import type { CommandModule } from "yargs";

import { expandTilde } from "../utils/paths.mts";

import { DEFAULT_CONFIG, parseConfigWithTransform } from "./config.mts";

/**
 * Options from `captioning.nodeWhisperOptions` in the config file.
 * These match the nodejs-whisper option names.
 */
interface NodeWhisperOptions {
  autoDownloadModelName?: string;
  modelName?: string;
  modelRootPath?: string;
  timestamps_length?: number;
  withCuda?: boolean;
}

/**
 * Transcript entry with word and timing information.
 * Format: [word, startTimeMs, endTimeMs]
 */
export type TranscriptEntry = [
  word: string,
  startTimeMs: number,
  endTimeMs: number,
];

/**
 * Options for transcribing audio.
 */
export interface TranscribeOptions {
  /**
   * Path to the audio file to transcribe.
   */
  audioFile: string;

  /**
   * Output directory for the generated files.
   */
  outputDir: string;

  /**
   * Whisper configuration options.
   */
  whisperConfig?: Partial<WhisperConfig>;
}

/**
 * Result of transcription.
 */
export interface TranscribeResult {
  /**
   * Path to the generated captions.vtt file.
   */
  captionsPath: string;

  /**
   * Path to the generated transcript.json file.
   */
  transcriptPath: string;
}

/**
 * Parse VTT timestamp to milliseconds.
 * Format: HH:MM:SS.mmm or MM:SS.mmm
 */
function parseVttTimestamp(timestamp: string): number {
  const parts = timestamp.split(":");
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (parts.length === 3) {
    assertType<[string, string, string]>(parts);
    hours = Number.parseInt(parts[0], 10);
    minutes = Number.parseInt(parts[1], 10);
    seconds = Number.parseFloat(parts[2]);
  } else if (parts.length === 2) {
    assertType<[string, string]>(parts);
    minutes = Number.parseInt(parts[0], 10);
    seconds = Number.parseFloat(parts[1]);
  }

  return Math.round(new Duration({ hours, minutes, seconds }).inMilliseconds());
}

/**
 * Parse the JSON output from nodejs-whisper to extract word timings.
 */
function parseWhisperJson(jsonContent: string): TranscriptEntry[] {
  const data = JSON.parse(jsonContent);
  const entries: TranscriptEntry[] = [];

  // nodejs-whisper outputs an array of transcription segments
  if (Array.isArray(data.transcription)) {
    for (const segment of data.transcription) {
      // Each segment has timestamps property with start/end and text
      if (segment.timestamps) {
        const startMs =
          Math.round(
            segment.timestamps.from.split(",").map(Number)[0] * 1000,
          ) || parseVttTimestamp(segment.timestamps.from);
        const endMs =
          Math.round(segment.timestamps.to.split(",").map(Number)[0] * 1000) ||
          parseVttTimestamp(segment.timestamps.to);

        // Split segment text into words and distribute time evenly
        const words = segment.text.trim().split(/\s+/).filter(Boolean);
        if (words.length > 0) {
          const duration = endMs - startMs;
          const wordDuration = duration / words.length;

          for (let i = 0; i < words.length; i++) {
            const wordStart = Math.round(startMs + i * wordDuration);
            const wordEnd = Math.round(startMs + (i + 1) * wordDuration);
            entries.push([words[i], wordStart, wordEnd]);
          }
        }
      }
    }
  }

  return entries;
}

/**
 * Transcribe an audio file using Whisper.
 *
 * @example
 * ```ts
 * import { transcribe } from "@liqvid/cli/transcribe";
 *
 * await transcribe({
 *   audioFile: "./audio.webm",
 *   outputDir: "./captions",
 *   whisperConfig: {
 *     modelName: "base.en",
 *   },
 * });
 * ```
 */
export async function transcribe(
  options: TranscribeOptions,
): Promise<TranscribeResult> {
  const { nodewhisper } = await import("nodejs-whisper");

  const { audioFile, outputDir, whisperConfig = {} } = options;

  // Ensure output directory exists
  await fsp.mkdir(outputDir, { recursive: true });

  // Resolve absolute paths
  const absoluteAudioFile = path.resolve(audioFile);
  const absoluteOutputDir = path.resolve(outputDir);

  // Configure whisper options
  const modelName = whisperConfig.modelName ?? "base.en";

  // Run whisper transcription
  // nodejs-whisper outputs files next to the input file, so we need to handle that
  await nodewhisper(absoluteAudioFile, {
    autoDownloadModelName: whisperConfig.autoDownloadModelName ?? modelName,
    modelName,
    modelRootPath: whisperConfig.modelRootPath
      ? expandTilde(whisperConfig.modelRootPath)
      : undefined,
    removeWavFileAfterTranscription: true,
    whisperOptions: {
      outputInJson: true,
      outputInVtt: true,
      splitOnWord: true,
      timestamps_length: whisperConfig.timestampsLength ?? 20,
      translateToEnglish: whisperConfig.translateToEnglish ?? false,
      wordTimestamps: true,
    },
    withCuda: whisperConfig.withCuda ?? false,
  });

  // nodejs-whisper creates output files next to the input audio file
  // with the same base name but different extensions
  const audioBaseName = path.basename(audioFile, path.extname(audioFile));
  const audioDir = path.dirname(absoluteAudioFile);

  const sourceVttPath = path.join(audioDir, `${audioBaseName}.vtt`);
  const sourceJsonPath = path.join(audioDir, `${audioBaseName}.json`);

  const targetVttPath = path.join(absoluteOutputDir, "captions.vtt");
  const targetJsonPath = path.join(absoluteOutputDir, "transcript.json");

  // Move VTT file to output directory
  try {
    await fsp.rename(sourceVttPath, targetVttPath);
  } catch {
    // If rename fails (cross-device), copy and delete
    await fsp.copyFile(sourceVttPath, targetVttPath);
    await fsp.unlink(sourceVttPath);
  }

  // Parse JSON and create transcript with word timings
  const jsonContent = await fsp.readFile(sourceJsonPath, "utf8");
  const transcript = parseWhisperJson(jsonContent);
  await fsp.writeFile(targetJsonPath, JSON.stringify(transcript, null, 2));

  // Clean up source JSON file
  await fsp.unlink(sourceJsonPath);

  return {
    captionsPath: targetVttPath,
    transcriptPath: targetJsonPath,
  };
}

/**
 * Transform nodeWhisperOptions from config file to CLI option names.
 */
function transformNodeWhisperOptions(
  config: NodeWhisperOptions,
): Record<string, unknown> {
  return {
    cuda: config.withCuda,
    model: config.modelName,
    "model-path": config.modelRootPath,
  };
}

export const transcribeCommand: CommandModule = {
  builder: (yargs) =>
    yargs
      .config(
        "config",
        parseConfigWithTransform(
          ["captioning", "nodeWhisperOptions"],
          transformNodeWhisperOptions,
        ),
      )
      .default("config", DEFAULT_CONFIG)
      .example([
        ["liqvid transcribe -i ./audio.webm -o ./captions"],
        ["liqvid transcribe -i ./audio.mp4 -o ./captions --model base.en"],
      ])
      .option("input", {
        alias: "i",
        demandOption: true,
        desc: "Path to the audio file to transcribe",
        normalize: true,
        type: "string",
      })
      .option("output", {
        alias: "o",
        demandOption: true,
        desc: "Output directory for generated files",
        normalize: true,
        type: "string",
      })
      .option("model", {
        alias: "m",
        default: "base.en",
        desc: "Whisper model to use",
        type: "string",
      })
      .option("model-path", {
        desc: "Directory containing Whisper model files",
        type: "string",
      })
      .option("cuda", {
        default: false,
        desc: "Use CUDA for faster processing",
        type: "boolean",
      })
      .option("translate", {
        default: false,
        desc: "Translate to English",
        type: "boolean",
      })
      .version(false),
  command: "transcribe",
  describe: "Transcribe audio to captions using Whisper",
  handler: async (argv) => {
    const result = await transcribe({
      audioFile: argv.input as string,
      outputDir: argv.output as string,
      whisperConfig: {
        modelName: argv.model as WhisperModelName,
        modelRootPath: argv["model-path"] as string | undefined,
        translateToEnglish: argv.translate as boolean,
        withCuda: argv.cuda as boolean,
      },
    });

    console.log(`Captions written to: ${result.captionsPath}`);
    console.log(`Transcript written to: ${result.transcriptPath}`);

    process.exit(0);
  },
};
