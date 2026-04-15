import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { transcribe } from "@liqvid/cli/transcribe";
import { StatusCodes } from "http-status-codes";

import type { CaptionsMeta } from "./contract.mts";

const CAPTIONS_DIR = ".liqvid/captions";
const META_FILE = "meta.json";

/** Track active caption generation jobs */
const activeJobs = new Set<string>();

interface GenerateCaptionsBody {
  modelName?: string;
}

/**
 * Find the first audio.webm file in the .liqvid directory.
 */
async function findAudioFile(projectDir: string): Promise<string | null> {
  const liqvidDir = path.join(projectDir, ".liqvid");

  try {
    // Search for audio.webm in recordings subdirectories
    const recordingsDir = path.join(liqvidDir, "recordings");
    const recordings = await fsp.readdir(recordingsDir);

    for (const recording of recordings) {
      const mediaDir = path.join(
        recordingsDir,
        recording,
        "@liqvid.media",
      );
      const audioPath = path.join(mediaDir, "audio.webm");

      try {
        await fsp.access(audioPath);
        return audioPath;
      } catch {
        // File doesn't exist, continue searching
      }
    }
  } catch {
    // Recordings directory doesn't exist
  }

  return null;
}

/**
 * Read captions metadata from the project.
 */
async function readCaptionsMeta(
  projectDir: string,
): Promise<CaptionsMeta | null> {
  const metaPath = path.join(projectDir, CAPTIONS_DIR, META_FILE);

  try {
    const content = await fsp.readFile(metaPath, "utf8");
    return JSON.parse(content) as CaptionsMeta;
  } catch {
    return null;
  }
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
export async function listCaptions(searchParams: URLSearchParams) {
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const projectDir = path.join(process.cwd(), "app", projectPath);
  const meta = await readCaptionsMeta(projectDir);

  return Response.json(meta);
}

/**
 * Generate captions for a project using Whisper.
 */
export async function generateCaptions(
  searchParams: URLSearchParams,
  body: GenerateCaptionsBody,
) {
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

  // Find audio file
  const audioFile = await findAudioFile(projectDir);
  if (!audioFile) {
    return Response.json(
      { error: "No audio file found in .liqvid directory" },
      { status: StatusCodes.NOT_FOUND },
    );
  }

  // Mark as generating
  activeJobs.add(projectPath);

  const outputDir = path.join(projectDir, CAPTIONS_DIR);

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
      // Load whisper config from liqvid.json if it exists
      let whisperConfig: Record<string, unknown> = {};
      try {
        const configPath = path.join(projectDir, "liqvid.json");
        const configContent = await fsp.readFile(configPath, "utf8");
        const config = JSON.parse(configContent);
        whisperConfig = config.whisper ?? {};
      } catch {
        // No config file or no whisper config
      }

      await transcribe({
        audioFile,
        outputDir,
        whisperConfig: {
          modelName: body.modelName ?? (whisperConfig.modelName as string),
          modelRootPath: whisperConfig.modelRootPath as string | undefined,
          translateToEnglish: whisperConfig.translateToEnglish as
            | boolean
            | undefined,
          withCuda: whisperConfig.withCuda as boolean | undefined,
        },
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
