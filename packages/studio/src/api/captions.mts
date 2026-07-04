import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { renderAudio } from "@liqvid/cli/render-audio";
import { transcribe } from "@liqvid/cli/transcribe";
import { Effect } from "effect";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../initialize.mts";
import { loadJsonEffect } from "../utils/effect.mts";
import { HttpError } from "../utils/errors.mts";

import type { CaptionsMeta } from "./contract.mts";
import { CaptionsMetaFromJson } from "./contract-effect.mts";

const CAPTIONS_DIR = ".liqvid/captions";
const META_FILE = "meta.json";
const AUDIO_FILE = "audio.wav";

/** Track active caption generation jobs */
const activeJobs = new Set<string>();

/**
 * Read captions metadata from the project.
 */
function readCaptionsMeta(projectDir: string) {
  const metaPath = path.join(projectDir, CAPTIONS_DIR, META_FILE);
  return loadJsonEffect(CaptionsMetaFromJson, metaPath);
}

/**
 * Write captions metadata to the project.
 */
async function writeCaptionsMeta(
  projectDir: string,
  meta: CaptionsMeta,
): Promise<void> {
  const captionsDir = path.join(projectDir, CAPTIONS_DIR);
  await fsp.mkdir(captionsDir, { recursive: true });

  const metaPath = path.join(captionsDir, META_FILE);
  await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2));
}

/**
 * List existing captions for a project.
 */
export function listCaptions(searchParams: URLSearchParams) {
  return Effect.gen(function* () {
    const projectPath = searchParams.get("projectPath");
    if (!projectPath) {
      return yield* new HttpError({
        message: "projectPath is required",
        status: StatusCodes.BAD_REQUEST,
      });
    }

    const projectDir = path.join(process.cwd(), "app", projectPath);

    return yield* readCaptionsMeta(projectDir);
  });
}

/**
 * Generate captions for a project using Whisper.
 */
export async function generateCaptions(searchParams: URLSearchParams) {
  const { basePath, config: $config, productionServerPort } = getServerState();
  if ($config.isNone) {
    throw new Error("config not loaded");
  }
  const config = $config.unwrap();

  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const projectDir = path.join(process.cwd(), "app", projectPath);

  // Check if already generating
  if (activeJobs.has(projectPath)) {
    return Response.json({ status: "already_generating" });
  }

  // Mark as generating
  activeJobs.add(projectPath);

  const outputDir = path.join(projectDir, CAPTIONS_DIR);
  const audioFile = path.join(outputDir, AUDIO_FILE);

  // Build the URL for the video
  const previewPath = `${basePath || ""}/${projectPath}/`;
  const url = `http://localhost:${productionServerPort}${previewPath}`;

  // Write initial metadata
  const initialMeta: CaptionsMeta = {
    captionsPath: path.join(outputDir, "captions.vtt"),
    createdAt: new Date().toISOString(),
    status: "generating",
    transcriptPath: path.join(outputDir, "transcript.json"),
  };
  await writeCaptionsMeta(projectDir, initialMeta);

  // Start transcription in background
  (async () => {
    try {
      // Create the audio file by rendering the video's audio track
      const audioStart = performance.now();
      await renderAudio({ output: audioFile, url });
      const audioElapsed = performance.now() - audioStart;
      console.log(
        `Created audio file for ${projectPath} in ${(audioElapsed / 1000).toFixed(2)}s`,
      );

      await transcribe({
        audioFile,
        outputDir,
        whisperConfig: config.media?.captioning?.nodeWhisperOptions,
      });

      // Update metadata to completed
      const completedMeta: CaptionsMeta = {
        ...initialMeta,
        status: "completed",
      };
      await writeCaptionsMeta(projectDir, completedMeta);
    } catch (error) {
      console.error("Failed to generate captions:", error);

      // Update metadata to failed
      const failedMeta: CaptionsMeta = {
        ...initialMeta,
        status: "failed",
      };
      await writeCaptionsMeta(projectDir, failedMeta);
    } finally {
      activeJobs.delete(projectPath);
    }
  })();

  return Response.json({ status: "started" });
}
