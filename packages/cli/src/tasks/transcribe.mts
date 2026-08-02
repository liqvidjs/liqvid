import * as path from "node:path";

import { NodeFileSystem } from "@effect/platform-node";
import type {
  RichTranscript,
  TranscriptEntry,
  WhisperConfig,
  WhisperModelName,
} from "@liqvid/schemas";
import { formatTimeMs, formatVttTimestamp } from "@liqvid/utils";
import { Effect, FileSystem, Layer } from "effect";
import { type AnyDir, type AnyFile, RelativeFile } from "effect-paths";
import type { TranscribeDetailedResult, TranscribeParams } from "smart-whisper";
import type { CommandModule } from "yargs";

import { CAPTIONS_FILE, RICH_TRANSCRIPT } from "../conventions.mts";
import { writeJSON } from "../utils/effect.mts";
import { expandTilde } from "../utils/paths.mts";
import { defaultCliProgressLayer } from "../utils/progress.mts";
import { Progress } from "../utils.mts";

import { DEFAULT_CONFIG, parseConfigWithTransform } from "./config.mts";

/**
 * Options from `captioning.nodeWhisperOptions` in the config file.
 */
interface NodeWhisperOptions {
  gpu?: boolean;
  modelName?: string;
  modelPath?: string;
}

/**
 * Options for transcribing audio.
 */
export interface TranscribeOptions {
  /**
   * Path to the audio file to transcribe. Must be a mono 16kHz PCM WAV file.
   */
  audioFile: AnyFile;

  /**
   * Output directory for the generated files.
   */
  outputDir: AnyDir;

  /**
   * Whisper configuration options.
   */
  whisperConfig?: Partial<WhisperConfig>;
}

/** Required PCM sample rate for whisper.cpp. */
const WHISPER_SAMPLE_RATE = 16_000;

/**
 * Decode a PCM WAV file into a mono `Float32Array` at 16kHz, as required by
 * `smart-whisper`. Supports 16-bit and 32-bit integer as well as 32-bit float
 * PCM. Multi-channel audio is downmixed by averaging channels.
 */
function decodeWav(buffer: Uint8Array): Float32Array {
  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  const readTag = (offset: number) =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );

  if (readTag(0) !== "RIFF" || readTag(8) !== "WAVE") {
    throw new Error("Not a valid WAV file");
  }

  // Walk the chunks to find `fmt ` and `data`.
  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = WHISPER_SAMPLE_RATE;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readTag(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;

    if (chunkId === "fmt ") {
      audioFormat = view.getUint16(body, true);
      numChannels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (chunkId === "data") {
      dataOffset = body;
      dataLength = chunkSize;
    }

    // Chunks are word-aligned (padded to even byte counts).
    offset = body + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0) {
    throw new Error("WAV file has no data chunk");
  }

  if (sampleRate !== WHISPER_SAMPLE_RATE) {
    throw new Error(
      `WAV sample rate must be ${WHISPER_SAMPLE_RATE}Hz, got ${sampleRate}Hz`,
    );
  }

  const bytesPerSample = bitsPerSample / 8;
  const totalSamples = Math.floor(dataLength / bytesPerSample);
  const frameCount = Math.floor(totalSamples / numChannels);
  const pcm = new Float32Array(frameCount);

  const readSample = (sampleOffset: number): number => {
    const at = dataOffset + sampleOffset * bytesPerSample;
    // 3 == WAVE_FORMAT_IEEE_FLOAT
    if (audioFormat === 3 && bitsPerSample === 32) {
      return view.getFloat32(at, true);
    }
    if (bitsPerSample === 16) {
      return view.getInt16(at, true) / 0x8000;
    }
    if (bitsPerSample === 32) {
      return view.getInt32(at, true) / 0x80000000;
    }
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`);
  };

  for (let frame = 0; frame < frameCount; frame++) {
    if (numChannels === 1) {
      pcm[frame] = readSample(frame);
    } else {
      let sum = 0;
      for (let channel = 0; channel < numChannels; channel++) {
        sum += readSample(frame * numChannels + channel);
      }
      pcm[frame] = sum / numChannels;
    }
  }

  return pcm;
}

/**
 * Build word-level transcript entries from a detailed `smart-whisper` result.
 *
 * When per-token timestamps are available they are used directly; otherwise
 * the segment text is split into words with time distributed evenly.
 */
function buildTranscript(
  segments: TranscribeDetailedResult<boolean>[],
): RichTranscript {
  const entries: TranscriptEntry[] = [];

  for (const segment of segments) {
    const tokensWithTiming = segment.tokens.filter(
      (token) =>
        typeof token.from === "number" &&
        typeof token.to === "number" &&
        token.text.trim().length > 0 &&
        // whisper.cpp emits special tokens wrapped in square brackets.
        !token.text.trim().startsWith("["),
    );

    if (tokensWithTiming.length > 0) {
      // Merge sub-word tokens into whole words. Whisper tokens for a new word
      // are typically prefixed with a leading space.
      let currentWord = "";
      let wordStart = 0;
      let wordEnd = 0;

      const flush = () => {
        const word = currentWord.trim();
        if (word.length > 0) {
          entries.push([word, wordStart, wordEnd]);
        }
        currentWord = "";
      };

      for (const token of tokensWithTiming) {
        const startsNewWord = token.text.startsWith(" ");
        if (startsNewWord && currentWord.length > 0) {
          flush();
        }
        if (currentWord.length === 0) {
          wordStart = token.from as number;
        }
        currentWord += token.text;
        wordEnd = token.to as number;
      }
      flush();
      continue;
    }

    // Fall back to distributing the segment time across its words.
    const words = segment.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    const duration = segment.to - segment.from;
    const wordDuration = duration / words.length;

    for (let i = 0; i < words.length; i++) {
      const wordStart = Math.round(segment.from + i * wordDuration);
      const wordEnd = Math.round(segment.from + (i + 1) * wordDuration);
      entries.push([words[i]!, wordStart, wordEnd]);
    }
  }

  return {
    captionBreaks: captionBreaksFromSegments(segments, entries),
    paragraphBreaks: [],
    words: entries,
  };
}

/**
 * Derive caption break indices from the segment boundaries: a break is placed
 * after the last word that ends within each segment's time span, so that each
 * caption corresponds to one transcription segment (mirroring the VTT cues,
 * which are the non-empty segments).
 */
function captionBreaksFromSegments(
  segments: TranscribeDetailedResult<boolean>[],
  entries: readonly TranscriptEntry[],
): number[] {
  const captionBreaks: number[] = [];
  let cursor = 0;

  for (const segment of segments) {
    // Only non-empty segments become VTT cues / caption boundaries.
    if (segment.text.trim().length === 0) continue;

    const endTime = segment.to;

    for (; cursor < entries.length; cursor++) {
      const wordEnd = entries[cursor]![2];

      if (wordEnd > endTime) {
        captionBreaks.push(cursor - 1);
        break;
      }
    }
  }

  return captionBreaks;
}

/**
 * Render segments to WebVTT.
 */
function buildVtt(segments: TranscribeDetailedResult<boolean>[]): string {
  const cues = segments
    .filter((segment) => segment.text.trim().length > 0)
    .map((segment) => {
      const from = formatVttTimestamp(segment.from);
      const to = formatVttTimestamp(segment.to);
      return `${from} --> ${to}\n${segment.text.trim()}`;
    });

  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
}

/**
 * Resolve a whisper model file path, downloading a named model on demand.
 */
function resolveModel(whisperConfig: Partial<WhisperConfig>) {
  return Effect.gen(function* () {
    const { manager } = yield* Effect.tryPromise(async () => {
      const whisper = await import("smart-whisper");
      return whisper;
    }).pipe(
      Effect.tapCause((cause) =>
        Effect.sync(() => console.dir(cause, { depth: null })),
      ),
    );

    yield* Effect.logDebug("imported smart-whisper");

    if (whisperConfig.modelPath) {
      return expandTilde(whisperConfig.modelPath);
    }

    const modelName = whisperConfig.modelName ?? "base.en";

    if (!manager.check(modelName)) {
      yield* Effect.log(`Downloading Whisper model "${modelName}"...`);
      yield* Effect.tryPromise(() => manager.download(modelName));
    }

    return manager.resolve(modelName);
  });
}

/**
 * Transcribe an audio file using Whisper (via `smart-whisper`).
 *
 * @example
 * ```ts
 * import { transcribe } from "@liqvid/cli/transcribe";
 *
 * await transcribe({
 *   audioFile: "./audio.wav",
 *   outputDir: "./captions",
 *   whisperConfig: {
 *     modelName: "base.en",
 *   },
 * });
 * ```
 */
export function transcribe({
  audioFile,
  outputDir,
  whisperConfig = {},
}: TranscribeOptions) {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // Ensure output directory exists
    yield* fs.makeDirectory(outputDir, { recursive: true });

    const absoluteAudioFile = path.resolve(audioFile);
    const absoluteOutputDir = path.resolve(outputDir);

    const targetVttPath = path.join(absoluteOutputDir, CAPTIONS_FILE);
    const targetJsonPath = path.join(absoluteOutputDir, RICH_TRANSCRIPT);

    // Load the model (downloading it on demand if referenced by name).
    yield* Effect.logDebug("finding model");
    const modelFile = yield* resolveModel(whisperConfig);
    yield* Effect.logDebug(`Using Whisper model at ${modelFile}`);

    yield* Effect.logDebug("decoding wav");

    // Decode the WAV file to mono 16kHz PCM.
    const wavBytes = yield* fs.readFile(absoluteAudioFile);
    const pcm = decodeWav(wavBytes);

    // Total audio duration in milliseconds, used for the progress bar total.
    const durationMs = Math.round((pcm.length / WHISPER_SAMPLE_RATE) * 1000);

    const { SingleBar } = yield* Progress;

    const opts = whisperConfig.whisperOptions;
    const params: Partial<TranscribeParams<"detail", true>> = {
      format: "detail",
      language: opts?.language ?? "auto",
      max_len: opts?.maxLen ?? 0,
      split_on_word: opts?.splitOnWord ?? false,
      token_timestamps: true,
      translate: whisperConfig.translateToEnglish ?? opts?.translate ?? false,
      ...(opts?.nThreads !== undefined ? { n_threads: opts.nThreads } : {}),
    };

    yield* Effect.logDebug("getting context");

    // Capture the current Effect context so the synchronous `transcribed`
    // event callback below can fork `Effect.log` fibers in real time,
    // preserving the caller's loggers and annotations.
    const context = yield* Effect.context<never>();

    yield* Effect.logDebug("got context");

    const segments = yield* Effect.acquireUseRelease(
      // acquire: load the model and start the progress bar
      Effect.tryPromise(async () => {
        const { Whisper } = await import("smart-whisper");
        const whisper = new Whisper(modelFile, {
          gpu: whisperConfig.gpu ?? false,
        });
        const bar = new SingleBar({ formatValue: formatTimeMs });
        bar.start(durationMs, 0);
        return { bar, whisper };
      }),
      // use: run the transcription
      ({ bar, whisper }) =>
        Effect.tryPromise(async () => {
          const task = await whisper.transcribe(pcm, params);

          // Forward each segment to Effect.log as soon as it is transcribed,
          // rather than waiting for the whole result, and advance the
          // progress bar to the segment's end time.
          task.on("transcribed", (segment) => {
            bar.update(Math.min(segment.to, durationMs));

            const text = segment.text.trim();
            if (text.length === 0) return;

            const line = `[${formatVttTimestamp(segment.from)} --> ${formatVttTimestamp(segment.to)}] ${text}`;

            Effect.runForkWith(context)(Effect.log(line));
          });

          return task.result;
        }),
      // release: stop the progress bar and free the model
      ({ bar, whisper }) =>
        Effect.promise(async () => {
          bar.update(durationMs);
          bar.stop();
          await whisper.free();
        }),
    ).pipe(
      Effect.tapError((error) =>
        Effect.logError("Transcription failed:", error),
      ),
    );

    yield* Effect.logDebug(`Transcribed ${segments.length} segments`);

    // Write captions and transcript.
    const vtt = buildVtt(segments);
    yield* fs.writeFileString(targetVttPath, vtt);

    const transcript = buildTranscript(segments);
    yield* writeJSON(targetJsonPath, transcript);

    yield* writeJSON(
      path.join(absoluteOutputDir, RelativeFile("transcript-raw.json")),
      segments,
    );

    return {
      captionsPath: targetVttPath,
      transcriptPath: targetJsonPath,
    };
  });
}

/**
 * Transform nodeWhisperOptions from config file to CLI option names.
 */
function transformNodeWhisperOptions(
  config: NodeWhisperOptions,
): Record<string, unknown> {
  return {
    gpu: config.gpu,
    model: config.modelName,
    "model-path": config.modelPath,
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
        ["liqvid transcribe -i ./audio.wav -o ./captions"],
        ["liqvid transcribe -i ./audio.wav -o ./captions --model base.en"],
      ])
      .option("input", {
        alias: "i",
        demandOption: true,
        desc: "Path to the audio file to transcribe (mono 16kHz WAV)",
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
        desc: "Path to a ggml Whisper model file",
        type: "string",
      })
      .option("gpu", {
        default: false,
        desc: "Use the GPU for inference",
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
    const result = await Effect.runPromise(
      transcribe({
        audioFile: argv.input as AnyFile,
        outputDir: argv.output as AnyDir,
        whisperConfig: {
          gpu: argv.gpu as boolean,
          modelName: argv.model as WhisperModelName,
          modelPath: argv["model-path"] as AnyFile | undefined,
          translateToEnglish: argv.translate as boolean,
        },
      }).pipe(
        Effect.provide(
          Layer.mergeAll(NodeFileSystem.layer, defaultCliProgressLayer()),
        ),
      ),
    );

    console.log(`Captions written to: ${result.captionsPath}`);
    console.log(`Transcript written to: ${result.transcriptPath}`);

    process.exit(0);
  },
};
