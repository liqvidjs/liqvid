import * as fs from "node:fs";
import * as path from "node:path";

import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import { Effect, FileSystem } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";
import { execa } from "execa";

import { GROUP_OF_PICTURE, INPUT, OVERWRITE } from "./ffmpeg-flags.ts";

const AUDIO_MP4 = RelativeFile("audio.mp4");
const AUDIO_WEBM = RelativeFile("audio.webm");

const VIDEO_ORIGINAL = RelativeFile("video-original.webm");
const VIDEO_WEBM = RelativeFile("video.webm");

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

/**
 * Re-encode WebM file to fix timing/seeking issues from browser recording.
 */
const fixWebmTiming = Effect.fn("fixWebmTiming")(function* (
  inputPath: AbsoluteFile,
) {
  const fs = yield* FileSystem.FileSystem;

  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, RelativeFile(`${base}-fixed${ext}`));

  yield* ffmpeg(OVERWRITE, INPUT, inputPath, "-c", "copy", tempPath);

  yield* fs.rename(tempPath, inputPath);
});

/**
 * Encode audio to MP4/AAC format.
 */
function encodeAudioMp4(inputPath: AbsoluteFile, outputPath: AbsoluteFile) {
  return ffmpeg(
    OVERWRITE,
    INPUT,
    inputPath,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outputPath,
  );
}

/**
 * Extract audio from video file.
 */
function extractAudio(inputPath: string, outputPath: string) {
  return ffmpeg(OVERWRITE, INPUT, inputPath, "-vn", "-c:a", "copy", outputPath);
}

/**
 * Remove audio from video file, keeping only video.
 */
function stripAudio(inputPath: AbsoluteFile, outputPath: AbsoluteFile) {
  return ffmpeg(OVERWRITE, INPUT, inputPath, "-an", "-c:v", "copy", outputPath);
}

/**
 * Encode video to HLS format for adaptive streaming.
 * Creates two quality levels: 360p (lo-fi) and original (hi-fi).
 */
const encodeHls = Effect.fn("encodeHls")(function* (
  inputPath: AbsoluteFile,
  outputDir: AbsoluteDir,
) {
  const fs = yield* FileSystem.FileSystem;

  yield* fs.makeDirectory(outputDir);

  // Create subdirectories for each quality level
  const v0Dir = path.join(outputDir, RelativeDir("v0"));
  const v1Dir = path.join(outputDir, RelativeDir("v1"));
  yield* fs.makeDirectory(v0Dir, { recursive: true });
  yield* fs.makeDirectory(v1Dir, { recursive: true });

  // Filter complex: split video into two streams
  // v0 = 360p (lo-fi), v1 = original (hi-fi)
  const filterComplex = [
    "[0:v]split=2[v0][v1]",
    "[v0]scale=w=-2:h=360[v0out]",
    "[v1]copy[v1out]",
  ].join(";");

  // Common encoding options for consistent HLS streaming
  const commonOpts = (streamIndex: number, bitrate: string) => [
    `-c:v:${streamIndex}`,
    "libx264",
    "-x264-params",
    "nal-hrd=cbr:force-cfr=1",
    `-b:v:${streamIndex}`,
    bitrate,
    `-maxrate:v:${streamIndex}`,
    bitrate,
    `-minrate:v:${streamIndex}`,
    bitrate,
    `-bufsize:v:${streamIndex}`,
    bitrate,
    "-preset",
    "fast",
    GROUP_OF_PICTURE,
    "48",
    "-sc_threshold",
    "0",
    "-keyint_min",
    "48",
  ];

  yield* ffmpeg(
    OVERWRITE,
    INPUT,
    inputPath,
    "-filter_complex",
    filterComplex,
    // Map streams
    "-map",
    "[v0out]",
    "-map",
    "[v1out]",
    // Lo-fi stream (360p @ 1Mbps)
    ...commonOpts(0, "1M"),
    // Hi-fi stream (original @ 3Mbps)
    ...commonOpts(1, "3M"),
    // HLS options
    "-f",
    "hls",
    "-hls_time",
    "2",
    "-hls_playlist_type",
    "vod",
    "-hls_flags",
    "independent_segments",
    "-hls_segment_type",
    "mpegts",
    "-hls_segment_filename",
    path.join(outputDir, RelativeFile("v%v/data%02d.ts")),
    "-master_pl_name",
    "stream.m3u8",
    "-var_stream_map",
    "v:0 v:1",
    path.join(outputDir, RelativeFile("v%v.m3u8")),
  );

  // Move playlist files into their respective directories
  for (const i of [0, 1]) {
    const srcPlaylist = path.join(outputDir, RelativeFile(`v${i}.m3u8`));
    const dstPlaylist = path.join(
      outputDir,
      RelativeDir(`v${i}`),
      RelativeFile(`v${i}.m3u8`),
    );
    if (yield* fs.exists(srcPlaylist)) {
      yield* fs.rename(srcPlaylist, dstPlaylist);
    }
  }

  // Fix the master playlist to reference the correct paths
  const masterPlaylist = path.join(outputDir, RelativeFile("stream.m3u8"));
  if (yield* fs.exists(masterPlaylist)) {
    let content = yield* fs.readFileString(masterPlaylist, "utf8");
    content = content.replace(/^v(\d+)\.m3u8$/gm, "v$1/v$1.m3u8");
    yield* fs.writeFileString(masterPlaylist, content);
  }
});

/**
 * Process audio-only recording.
 * - Fix WebM timing for seeking
 * - Create MP4/AAC version
 */
const processAudioOnly = Effect.fn("processAudioOnly")(
  function* (dirname: AbsoluteDir) {
    const audioWebm = path.join(dirname, AUDIO_WEBM);
    const audioMp4 = path.join(dirname, AUDIO_MP4);

    // Fix WebM timing
    yield* Effect.logInfo("fixing audio.webm timing...");
    yield* fixWebmTiming(audioWebm);

    // Encode to MP4
    yield* Effect.logInfo("encoding audio.mp4...");
    yield* encodeAudioMp4(audioWebm, audioMp4);
  },
  (effect, dirname) =>
    effect.pipe(
      Effect.annotateLogs({
        _op: "processAudioOnly",
        dirname,
      }),
    ),
);

/**
 * Process video recording.
 * - Extract audio track
 * - Create silent video
 * - Encode audio to MP4
 * - Encode video to HLS
 */
const processVideo = Effect.fn("processVideo")(
  function* (dirname: AbsoluteDir) {
    const videoWebm = path.join(dirname, VIDEO_WEBM);
    const audioWebm = path.join(dirname, AUDIO_WEBM);
    const audioMp4 = path.join(dirname, AUDIO_MP4);
    const hlsDir = path.join(dirname, HLS_DIR);

    const fs = yield* FileSystem.FileSystem;

    // We need a temp file for the original video since we'll overwrite video.webm
    const tempVideo = path.join(dirname, VIDEO_ORIGINAL);
    yield* fs.rename(videoWebm, tempVideo);

    try {
      // Extract audio from video
      yield* Effect.logInfo("extracting audio track...");
      yield* extractAudio(tempVideo, audioWebm);

      // Create silent video
      yield* Effect.logInfo("creating silent video.webm...");
      yield* stripAudio(tempVideo, videoWebm);

      // Fix WebM timing for both files
      yield* Effect.logInfo("fixing audio.webm timing...");
      yield* fixWebmTiming(audioWebm);

      // console.log("Fixing video.webm timing...");
      // await fixWebmTiming(videoWebm);

      // Encode audio to MP4
      yield* Effect.logInfo("encoding audio.mp4...");
      yield* encodeAudioMp4(audioWebm, audioMp4);

      // Encode video to HLS
      yield* Effect.logInfo("encoding HLS...");
      yield* encodeHls(videoWebm, hlsDir);

      yield* Effect.logInfo("video post-processing complete.");
    } finally {
      // Clean up temp file
      if (yield* fs.exists(tempVideo)) {
        yield* fs.remove(tempVideo);
      }
    }
  },
  (effect, dirname) =>
    effect.pipe(
      Effect.annotateLogs({
        _op: "processVideo",
        dirname,
      }),
    ),
);

/**
 * Post-process @liqvid/media recording data.
 */
const postProcessRecording = Effect.fn("postProcessRecording")(function* ({
  dirname,
}: {
  dirname: AbsoluteDir;
}) {
  // Check if ffmpeg is available
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
    yield* processVideo(dirname);
  } else if (hasAudio) {
    yield* processAudioOnly(dirname);
  }
});

/**
 * Invoke FFmpeg as an Effect.
 */
function ffmpeg(...args: string[]) {
  return Effect.tryPromise((cancelSignal) =>
    execa({ cancelSignal })("ffmpeg", args),
  );
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
