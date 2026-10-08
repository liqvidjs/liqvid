import * as fs from "node:fs";
import { homedir } from "node:os";
import * as path from "node:path";

import type {
  LiqvidConfig,
  RichTranscript,
  TranscriptEntry,
} from "@liqvid/schemas";
import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import { formatVttTimestamp } from "@liqvid/utils";
import type Ffmpeg from "@ts-ffmpeg/fluent-ffmpeg";
import ffmpeg from "@ts-ffmpeg/fluent-ffmpeg";
import { Cause, Effect, FileSystem } from "effect";
import {
  type AbsoluteDir,
  AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import { execa } from "execa";
import type { TranscribeDetailedResult, TranscribeParams } from "smart-whisper";

import { GROUP_OF_PICTURE } from "./ffmpeg-flags.ts";
import type {
  AudioExtractConfig,
  AudioMp4Config,
  FfmpegOperationConfig,
  HlsConfig,
  HlsVariantConfig,
  LiqvidMediaPluginConfig,
  VideoStripConfig,
} from "./liqvid-studio-server-plugin/config.ts";
import {
  AUDIO_MP4,
  AUDIO_WEBM,
  VIDEO_WEBM,
} from "./liqvid-studio-server-plugin/conventions.ts";

/** Temporary 16kHz mono WAV used as the Whisper input, deleted after use. */
const AUDIO_PCM_WAV = RelativeFile("audio-16khz.wav");

const CAPTIONS_VTT = RelativeFile("captions.vtt");
const PLAIN_TRANSCRIPT = RelativeFile("plain.txt");
const RICH_TRANSCRIPT = RelativeFile("transcript.json");

const VIDEO_ORIGINAL = RelativeFile("video-original.webm");
const HLS_DIR = RelativeDir("hls");

/**
 * Check if ffmpeg is available.
 */
async function checkFfmpeg(): Promise<boolean> {
  try {
    await execa("ffmpeg", ["-version"]);
    return true;
  } catch {
    return false;
  }
}

function runFfmpeg(
  inputPath: AbsoluteFile,
  outputPath: AbsoluteFile,
  operation: FfmpegOperationConfig,
  overwrite: boolean,
  configure: (command: Ffmpeg.FfmpegCommand) => void = () => {},
) {
  return Effect.tryPromise(
    (signal) =>
      new Promise<void>((resolve, reject) => {
        const command = ffmpeg(inputPath, {
          ...operation.command,
          signal,
        });

        if (operation.inputOptions?.length) {
          command.inputOptions(...operation.inputOptions);
        }
        configure(command);
        command.outputOptions(
          ...(overwrite ? ["-y"] : ["-n"]),
          ...(operation.outputOptions ?? []),
        );
        command
          .output(outputPath)
          .on("error", reject)
          .on("end", () => resolve())
          .run();
      }),
  );
}

/**
 * Re-encode WebM file to fix timing/seeking issues from browser recording.
 */
const fixWebmTiming = Effect.fnUntraced(function* (inputPath: AbsoluteFile) {
  const fs = yield* FileSystem.FileSystem;

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, RelativeFile(`${base}-fixed${ext}`));

  yield* runFfmpeg(
    inputPath,
    tempPath,
    { outputOptions: ["-codec", "copy"] },
    true,
  );

  yield* fs.rename(tempPath, inputPath);
});

/**
 * Encode audio to MP4/AAC format.
 */
function encodeAudioMp4(
  inputPath: AbsoluteFile,
  outputPath: AbsoluteFile,
  config: AudioMp4Config,
) {
  return runFfmpeg(inputPath, outputPath, config, true, (command) => {
    command.noVideo();
    if (config.codec) command.audioCodec(config.codec);
    if (config.bitrate) command.audioBitrate(config.bitrate);
    command.format("mp4");
  });
}

/**
 * Extract audio from video file.
 */
function extractAudio(
  inputPath: AbsoluteFile,
  outputPath: AbsoluteFile,
  config: AudioExtractConfig,
) {
  return runFfmpeg(inputPath, outputPath, config, true, (command) => {
    command.noVideo();
    if (config.codec !== undefined) command.audioCodec(config.codec);
  });
}

/**
 * Remove audio from video file, keeping only video.
 */
function stripAudio(
  inputPath: AbsoluteFile,
  outputPath: AbsoluteFile,
  config: VideoStripConfig,
) {
  return runFfmpeg(inputPath, outputPath, config, true, (command) => {
    command.noAudio();
    if (config.codec !== undefined) command.videoCodec(config.codec);
  });
}

const DEFAULT_HLS_VARIANTS: HlsVariantConfig[] = [
  { bitrate: "1M", height: 360, name: "360p" },
  { bitrate: "3M", name: "original" },
];

/**
 * Encode video to HLS format for adaptive streaming.
 */
const encodeHls = Effect.fnUntraced(function* (
  inputPath: AbsoluteFile,
  outputDir: AbsoluteDir,
  config: HlsConfig,
) {
  const fs = yield* FileSystem.FileSystem;
  const variants = config.variants ?? DEFAULT_HLS_VARIANTS;

  if (variants.length === 0) return;

  yield* fs.makeDirectory(outputDir, { recursive: true });

  // Create one subdirectory for each named rendition.
  for (const variant of variants) {
    yield* fs.makeDirectory(path.join(outputDir, RelativeDir(variant.name)), {
      recursive: true,
    });
  }

  const filterComplex = [
    `[0:v]split=${variants.length}${variants.map((_, i) => `[v${i}]`).join("")}`,
    ...variants.map((variant, index) =>
      variant.height
        ? `[v${index}]scale=w=-2:h=${variant.height}[v${index}out]`
        : `[v${index}]copy[v${index}out]`,
    ),
  ].join(";");
  const maps = variants.map((_, index) => `[v${index}out]`);
  const outputOptions = variants.flatMap((variant, index) => {
    const options: string[] = [];
    const append = (option: string, value: string | number | undefined) => {
      if (value !== undefined)
        options.push(`${option}:v:${index}`, String(value));
    };

    append("-c", variant.codec ?? "libx264");
    append("-b", variant.bitrate);
    append("-maxrate", variant.maxRate ?? variant.bitrate);
    append("-minrate", variant.minRate ?? variant.bitrate);
    append("-bufsize", variant.bufferSize ?? variant.bitrate);
    return options;
  });

  const commonOptions: string[] = [];
  if (config.x264Params !== undefined) {
    commonOptions.push("-x264-params", config.x264Params);
  }
  if (config.preset !== undefined) commonOptions.push("-preset", config.preset);
  const groupOfPictures = config.groupOfPictures;
  if (groupOfPictures !== undefined) {
    commonOptions.push(GROUP_OF_PICTURE, String(groupOfPictures));
  }
  if (config.sceneThreshold !== undefined) {
    commonOptions.push("-sc_threshold", String(config.sceneThreshold));
  }
  if (config.keyframeMin !== undefined) {
    commonOptions.push("-keyint_min", String(config.keyframeMin));
  }

  const hlsOptions = [
    "-f",
    "hls",
    "-hls_time",
    String(config.segmentDuration ?? 2),
    "-hls_playlist_type",
    config.playlistType ?? "vod",
    "-hls_flags",
    (config.flags ?? ["independent_segments"]).join("+"),
    "-hls_segment_type",
    config.segmentType ?? "mpegts",
    "-hls_segment_filename",
    path.join(outputDir, RelativeFile("%v/data%02d.ts")),
    "-master_pl_name",
    "stream.m3u8",
    "-var_stream_map",
    variants
      .map((variant, index) => `v:${index},name:${variant.name}`)
      .join(" "),
  ];

  yield* runFfmpeg(
    inputPath,
    path.join(outputDir, RelativeFile("%v/playlist.m3u8")),
    {
      ...config,
      outputOptions: [
        ...outputOptions,
        ...commonOptions,
        ...hlsOptions,
        ...(config.outputOptions ?? []),
      ],
    },
    true,
    (command) =>
      command.complexFilter(
        config.filterComplex ?? filterComplex,
        config.map ?? maps,
      ),
  );

  // Give each rendition playlist its stable, descriptive filename.
  for (const index of variants.keys()) {
    const variantName = variants[index]!.name;
    const variantDir = path.join(outputDir, RelativeDir(variantName));
    const srcPlaylist = path.join(variantDir, RelativeFile("playlist.m3u8"));
    const dstPlaylist = path.join(
      variantDir,
      RelativeFile(`${variantName}.m3u8`),
    );
    if (yield* fs.exists(srcPlaylist)) {
      if (yield* fs.exists(dstPlaylist)) {
        yield* fs.remove(dstPlaylist);
      }
      yield* fs.rename(srcPlaylist, dstPlaylist);
    }

    // Remove indexed rendition playlists left by earlier versions that wrote
    // them at the HLS root instead of inside their variant directories.
    const legacyPlaylist = path.join(outputDir, RelativeFile(`v${index}.m3u8`));
    if (yield* fs.exists(legacyPlaylist)) {
      yield* fs.remove(legacyPlaylist);
    }
  }

  // Fix the master playlist to reference the new rendition playlist paths.
  const masterPlaylist = path.join(outputDir, RelativeFile("stream.m3u8"));
  if (yield* fs.exists(masterPlaylist)) {
    const content = yield* fs.readFileString(masterPlaylist, "utf8");
    yield* fs.writeFileString(
      masterPlaylist,
      content
        .replace(
          /^([^/\r\n]+)\/playlist\.m3u8$/gm,
          (_match, name: string) => `${name}/${name}.m3u8`,
        )
        .replace(/^v(\d+)\.m3u8$/gm, "v$1/v$1.m3u8"),
    );
  }
});

/** Re-create HLS renditions for an already-processed video recording. */
export const reprocessHls = Effect.fnUntraced(function* (
  dirname: AbsoluteDir,
  config: LiqvidMediaPluginConfig,
) {
  const fs = yield* FileSystem.FileSystem;
  const videoPath = path.join(dirname, VIDEO_WEBM);

  if (!(yield* fs.exists(videoPath))) {
    return yield* Effect.die({ message: "video.webm does not exist" });
  }

  const hlsDir = path.join(dirname, HLS_DIR);
  yield* Effect.logInfo("re-encoding HLS...");
  yield* fs.remove(hlsDir, { force: true, recursive: true });
  yield* encodeHls(videoPath, hlsDir, config.video?.hls ?? {});
  yield* Effect.logInfo("HLS reprocessing complete.");
});

/* ------------------------------------------------------------------------ */
/*                              transcription                               */
/* ------------------------------------------------------------------------ */

type TranscriptionConfig = NonNullable<
  LiqvidMediaPluginConfig["audio"]
>["transcribe"];

/** Required PCM sample rate for whisper.cpp. */
const WHISPER_SAMPLE_RATE = 16_000;

/** Whisper model used for transcription, downloaded on demand. */
const WHISPER_MODEL = "base.en";

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
  segments: readonly TranscribeDetailedResult<boolean>[],
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
  segments: readonly TranscribeDetailedResult<boolean>[],
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
 * Render segments as plain text, one segment per line.
 */
function buildPlainTranscript(
  segments: readonly TranscribeDetailedResult<boolean>[],
): string {
  const lines = segments
    .map((segment) => segment.text.trim())
    .filter((text) => text.length > 0);

  return `${lines.join("\n")}\n`;
}

/**
 * Transcribe an audio file with Whisper (via `smart-whisper`), writing the
 * outputs requested by {@link TranscriptionConfig} to `outputDir`.
 */
const transcribeAudio = Effect.fnUntraced(function* (
  audioPath: AbsoluteFile,
  outputDir: AbsoluteDir,
  config: TranscriptionConfig,
  whisperConfig?: NonNullable<
    NonNullable<LiqvidConfig["media"]>["captioning"]
  >["smartWhisperOptions"],
) {
  const fs = yield* FileSystem.FileSystem;

  // whisper.cpp needs mono 16kHz PCM, so convert the audio to WAV first.
  const wavPath = path.join(outputDir, AUDIO_PCM_WAV);
  yield* runFfmpeg(audioPath, wavPath, {}, true, (command) => {
    command.noVideo();
    command.audioChannels(1);
    command.audioFrequency(WHISPER_SAMPLE_RATE);
    command.audioCodec("pcm_s16le");
    command.format("wav");
  });

  try {
    const { manager, Whisper } = yield* Effect.tryPromise(
      () => import("smart-whisper"),
    );

    // An explicit model path takes precedence over the managed model name.
    // Expand ~/ because project config commonly stores user-local model paths.
    let modelFile: AbsoluteFile;
    if (whisperConfig?.modelPath) {
      const configuredPath = whisperConfig.modelPath.replace(
        /^~(?=\/)/,
        homedir(),
      );
      modelFile = AbsoluteFile(path.resolve(configuredPath));
      if (!(yield* fs.exists(modelFile))) {
        return yield* Effect.fail(
          new Error(`Whisper model not found at "${modelFile}"`),
        );
      }
    } else {
      const modelName = whisperConfig?.modelName ?? WHISPER_MODEL;
      if (!manager.check(modelName)) {
        yield* Effect.logInfo(`Downloading Whisper model "${modelName}"...`);
        yield* Effect.tryPromise(() => manager.download(modelName));
      }
      modelFile = AbsoluteFile(manager.resolve(modelName));
    }

    // Decode the WAV file to mono 16kHz PCM.
    const pcm = decodeWav(yield* fs.readFile(wavPath));

    const whisperOptions = whisperConfig?.whisperOptions;
    const params: Partial<TranscribeParams<"detail", true>> = {
      format: "detail",
      language: whisperOptions?.language ?? "auto",
      max_len: whisperOptions?.maxLen ?? 0,
      split_on_word: whisperOptions?.splitOnWord ?? false,
      token_timestamps: true,
      translate:
        whisperConfig?.translateToEnglish ?? whisperOptions?.translate ?? false,
      ...(whisperOptions?.nThreads !== undefined
        ? { n_threads: whisperOptions.nThreads }
        : {}),
    };

    // Capture the current Effect context so the synchronous `transcribed`
    // event callback below can fork `Effect.log` fibers in real time,
    // preserving the caller's loggers and annotations.
    const context = yield* Effect.context<never>();

    const segments = yield* Effect.acquireUseRelease(
      // acquire: load the model
      Effect.tryPromise(
        async () =>
          new Whisper(modelFile, { gpu: whisperConfig?.gpu ?? false }),
      ),
      // use: run the transcription
      (whisper) =>
        Effect.tryPromise(async () => {
          const task = await whisper.transcribe(pcm, params);

          // Forward each segment to Effect.log as soon as it is transcribed,
          // rather than waiting for the whole result.
          task.on("transcribed", (segment) => {
            const text = segment.text.trim();
            if (text.length === 0) return;

            const line = `[${formatVttTimestamp(segment.from)} --> ${formatVttTimestamp(segment.to)}] ${text}`;

            Effect.runForkWith(context)(Effect.log(line));
          });

          return task.result;
        }),
      // release: free the model
      (whisper) => Effect.promise(() => whisper.free()),
    );

    yield* Effect.logDebug(`transcribed ${segments.length} segments`);

    if (config.captions === true) {
      yield* fs.writeFileString(
        path.join(outputDir, CAPTIONS_VTT),
        buildVtt(segments),
      );
    }

    if (config.plain === true) {
      yield* fs.writeFileString(
        path.join(outputDir, PLAIN_TRANSCRIPT),
        buildPlainTranscript(segments),
      );
    }

    if (config.transcript === true) {
      yield* fs.writeFileString(
        path.join(outputDir, RICH_TRANSCRIPT),
        JSON.stringify(buildTranscript(segments), null, 2),
      );
    }
  } finally {
    if (yield* fs.exists(wavPath)) {
      yield* fs.remove(wavPath);
    }
  }
});

/**
 * Whether any transcription output was requested.
 */
export function wantsTranscription(
  config: TranscriptionConfig | undefined,
): boolean {
  return (
    config?.captions === true ||
    config?.plain === true ||
    config?.transcript === true
  );
}

/**
 * Run transcription if requested, logging failures without interrupting the
 * rest of post-processing.
 */
const maybeTranscribe = Effect.fnUntraced(function* (
  audioPath: AbsoluteFile,
  outputDir: AbsoluteDir,
  config: TranscriptionConfig | undefined,
  whisperConfig?: NonNullable<
    NonNullable<LiqvidConfig["media"]>["captioning"]
  >["smartWhisperOptions"],
) {
  if (!wantsTranscription(config)) return;

  yield* Effect.logInfo("transcribing audio...");
  yield* transcribeAudio(audioPath, outputDir, config!, whisperConfig).pipe(
    Effect.catchCause((cause) =>
      Effect.logError(`transcription failed:\n${Cause.pretty(cause)}`),
    ),
  );
});

/** Generate only the plain-text transcript for an existing recording. */
export const generatePlainTranscript = Effect.fnUntraced(function* (
  dirname: AbsoluteDir,
  config: LiqvidMediaPluginConfig,
  whisperConfig?: NonNullable<
    NonNullable<LiqvidConfig["media"]>["captioning"]
  >["smartWhisperOptions"],
) {
  if (!wantsTranscription(config.audio?.transcribe)) {
    return yield* Effect.die({
      message: "Transcription is not configured",
    });
  }

  const fs = yield* FileSystem.FileSystem;
  const audioPath = path.join(dirname, AUDIO_WEBM);
  const videoPath = path.join(dirname, VIDEO_WEBM);
  const inputPath = (yield* fs.exists(audioPath))
    ? audioPath
    : (yield* fs.exists(videoPath))
      ? videoPath
      : undefined;

  if (!inputPath) {
    return yield* Effect.die({ message: "No audio or video file exists" });
  }

  yield* transcribeAudio(
    inputPath,
    dirname,
    {
      captions: false,
      plain: true,
      transcript: false,
    },
    whisperConfig,
  );
});

/**
 * Process audio-only recording.
 */
const processAudioOnly = Effect.fnUntraced(function* (
  dirname: AbsoluteDir,
  config: LiqvidMediaPluginConfig,
  whisperConfig?: NonNullable<
    NonNullable<LiqvidConfig["media"]>["captioning"]
  >["smartWhisperOptions"],
) {
  const audioWebm = path.join(dirname, AUDIO_WEBM);
  const audioMp4 = path.join(dirname, AUDIO_MP4);
  const audioConfig = config.audio?.mp4 ?? {};

  yield* Effect.logInfo("fixing audio.webm timing...");
  yield* fixWebmTiming(audioWebm);

  if (audioConfig.enabled !== false) {
    yield* Effect.logInfo("encoding audio.mp4...");
    yield* encodeAudioMp4(audioWebm, audioMp4, audioConfig);
  }

  yield* maybeTranscribe(
    audioWebm,
    dirname,
    config.audio?.transcribe,
    whisperConfig,
  );
});

/**
 * Process video recording.
 */
const processVideo = Effect.fnUntraced(function* (
  dirname: AbsoluteDir,
  config: LiqvidMediaPluginConfig,
  whisperConfig?: NonNullable<
    NonNullable<LiqvidConfig["media"]>["captioning"]
  >["smartWhisperOptions"],
) {
  const videoWebm = path.join(dirname, VIDEO_WEBM);
  const audioWebm = path.join(dirname, AUDIO_WEBM);
  const audioMp4 = path.join(dirname, AUDIO_MP4);
  const hlsDir = path.join(dirname, HLS_DIR);
  const fs = yield* FileSystem.FileSystem;
  const extractConfig = config.audio?.extract ?? {};
  const stripConfig = config.video?.stripAudio ?? {};
  const audioConfig = config.audio?.mp4 ?? {};
  const hlsConfig = config.video?.hls ?? {};

  const tempVideo = path.join(dirname, VIDEO_ORIGINAL);
  yield* fs.rename(videoWebm, tempVideo);

  try {
    if (extractConfig.enabled !== false) {
      yield* Effect.logInfo("extracting audio track...");
      yield* extractAudio(tempVideo, audioWebm, extractConfig);
    }

    if (stripConfig.enabled !== false) {
      yield* Effect.logInfo("creating silent video.webm...");
      yield* stripAudio(tempVideo, videoWebm, stripConfig);
    }

    yield* Effect.logInfo("fixing audio.webm timing...");
    yield* fixWebmTiming(audioWebm);

    if (extractConfig.enabled !== false && audioConfig.enabled !== false) {
      yield* Effect.logInfo("encoding audio.mp4...");
      yield* encodeAudioMp4(audioWebm, audioMp4, audioConfig);
    }

    if (extractConfig.enabled !== false) {
      yield* maybeTranscribe(
        audioWebm,
        dirname,
        config.audio?.transcribe,
        whisperConfig,
      );
    }

    if (stripConfig.enabled !== false && hlsConfig.enabled !== false) {
      yield* Effect.logInfo("encoding HLS...");
      yield* encodeHls(videoWebm, hlsDir, hlsConfig);
    }

    yield* Effect.logInfo("video post-processing complete.");
  } finally {
    if (yield* fs.exists(tempVideo)) {
      yield* fs.remove(tempVideo);
    }
  }
});

/**
 * Post-process @liqvid/media recording data.
 */
const postProcessRecording = Effect.fnUntraced(function* ({
  config,
  dirname,
  projectConfig,
}: {
  config: LiqvidMediaPluginConfig | undefined;
  dirname: AbsoluteDir;
  projectConfig?: unknown;
}) {
  const pluginConfig = config ?? {};
  const whisperConfig = (projectConfig as LiqvidConfig | undefined)?.media
    ?.captioning?.smartWhisperOptions;

  if (!(yield* Effect.promise(checkFfmpeg))) {
    console.warn(
      "ffmpeg not found. Skipping @liqvid/media post-processing. " +
        "Install ffmpeg to enable audio/video encoding.",
    );
    return;
  }

  const audioWebm = path.join(dirname, AUDIO_WEBM);
  const videoWebm = path.join(dirname, VIDEO_WEBM);

  const hasAudio = fs.existsSync(audioWebm);
  const hasVideo = fs.existsSync(videoWebm);

  if (hasVideo) {
    yield* processVideo(dirname, pluginConfig, whisperConfig);
  } else if (hasAudio) {
    yield* processAudioOnly(dirname, pluginConfig, whisperConfig);
  }
});

const plugin: LiqvidStudioServerPlugin<LiqvidMediaPluginConfig> = {
  postProcessRecording,
};

// biome-ignore lint/style/noDefaultExport: Studio's plugin loader accepts the default export.
export default plugin;
