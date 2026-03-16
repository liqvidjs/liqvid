import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import type { LiqvidStudioServerPlugin } from "@liqvid/studio-plugin-api";
import { execa } from "execa";

const AUDIO_WEBM = "audio.webm";
const VIDEO_WEBM = "video.webm";
const AUDIO_MP4 = "audio.mp4";
const HLS_DIR = "hls";

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
async function fixWebmTiming(inputPath: string): Promise<void> {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const base = path.basename(inputPath, ext);
  const tempPath = path.join(dir, `${base}-fixed${ext}`);

  await execa("ffmpeg", ["-y", "-i", inputPath, "-c", "copy", tempPath]);

  await fsp.rename(tempPath, inputPath);
}

/**
 * Encode audio to MP4/AAC format.
 */
async function encodeAudioMp4(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await execa("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    outputPath,
  ]);
}

/**
 * Extract audio from video file.
 */
async function extractAudio(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await execa("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-vn",
    "-c:a",
    "copy",
    outputPath,
  ]);
}

/**
 * Remove audio from video file, keeping only video.
 */
async function stripAudio(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await execa("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-an",
    "-c:v",
    "copy",
    outputPath,
  ]);
}

/**
 * Encode video to HLS format for adaptive streaming.
 * Creates two quality levels: 360p (lo-fi) and original (hi-fi).
 */
async function encodeHls(inputPath: string, outputDir: string): Promise<void> {
  await fsp.mkdir(outputDir, { recursive: true });

  // Create subdirectories for each quality level
  const v0Dir = path.join(outputDir, "v0");
  const v1Dir = path.join(outputDir, "v1");
  await fsp.mkdir(v0Dir, { recursive: true });
  await fsp.mkdir(v1Dir, { recursive: true });

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
    "-g",
    "48",
    "-sc_threshold",
    "0",
    "-keyint_min",
    "48",
  ];

  await execa("ffmpeg", [
    "-y",
    "-i",
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
    path.join(outputDir, "v%v/data%02d.ts"),
    "-master_pl_name",
    "stream.m3u8",
    "-var_stream_map",
    "v:0 v:1",
    path.join(outputDir, "v%v.m3u8"),
  ]);

  // Move playlist files into their respective directories
  for (const i of [0, 1]) {
    const srcPlaylist = path.join(outputDir, `v${i}.m3u8`);
    const dstPlaylist = path.join(outputDir, `v${i}`, `v${i}.m3u8`);
    if (fs.existsSync(srcPlaylist)) {
      await fsp.rename(srcPlaylist, dstPlaylist);
    }
  }

  // Fix the master playlist to reference the correct paths
  const masterPlaylist = path.join(outputDir, "stream.m3u8");
  if (fs.existsSync(masterPlaylist)) {
    let content = await fsp.readFile(masterPlaylist, "utf-8");
    content = content.replace(/^v(\d+)\.m3u8$/gm, "v$1/v$1.m3u8");
    await fsp.writeFile(masterPlaylist, content);
  }
}

/**
 * Process audio-only recording.
 * - Fix WebM timing for seeking
 * - Create MP4/AAC version
 */
async function processAudioOnly(dirname: string): Promise<void> {
  const audioWebm = path.join(dirname, AUDIO_WEBM);
  const audioMp4 = path.join(dirname, AUDIO_MP4);

  // Fix WebM timing
  console.log("Fixing audio.webm timing...");
  await fixWebmTiming(audioWebm);

  // Encode to MP4
  console.log("Encoding audio.mp4...");
  await encodeAudioMp4(audioWebm, audioMp4);
}

/**
 * Process video recording.
 * - Extract audio track
 * - Create silent video
 * - Encode audio to MP4
 * - Encode video to HLS
 */
async function processVideo(dirname: string): Promise<void> {
  const videoWebm = path.join(dirname, VIDEO_WEBM);
  const audioWebm = path.join(dirname, AUDIO_WEBM);
  const audioMp4 = path.join(dirname, AUDIO_MP4);
  const hlsDir = path.join(dirname, HLS_DIR);

  // We need a temp file for the original video since we'll overwrite video.webm
  const tempVideo = path.join(dirname, "video-original.webm");
  await fsp.rename(videoWebm, tempVideo);

  try {
    // Extract audio from video
    console.log("Extracting audio track...");
    await extractAudio(tempVideo, audioWebm);

    // Create silent video
    console.log("Creating silent video.webm...");
    await stripAudio(tempVideo, videoWebm);

    // Fix WebM timing for both files
    console.log("Fixing audio.webm timing...");
    await fixWebmTiming(audioWebm);

    // console.log("Fixing video.webm timing...");
    // await fixWebmTiming(videoWebm);

    // Encode audio to MP4
    console.log("Encoding audio.mp4...");
    await encodeAudioMp4(audioWebm, audioMp4);

    // Encode video to HLS
    console.log("Encoding HLS...");
    await encodeHls(videoWebm, hlsDir);
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempVideo)) {
      await fsp.unlink(tempVideo);
    }
  }
}

/**
 * Post-process @liqvid/media recording data.
 */
async function postProcessRecording({
  dirname,
}: {
  dirname: string;
}): Promise<void> {
  // Check if ffmpeg is available
  if (!(await checkFfmpeg())) {
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
    await processVideo(dirname);
  } else if (hasAudio) {
    await processAudioOnly(dirname);
  }
}

const plugin: LiqvidStudioServerPlugin = {
  postProcessRecording,
};

export default plugin;
