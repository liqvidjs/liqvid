import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { generateThumbs as generateThumbsApi } from "@liqvid/cli/thumbs";
import {
  ThumbnailOptions,
  type ThumbnailsJob,
} from "@liqvid/schemas/jobs/thumbnails";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../initialize.mts";

const THUMBS_BASE_DIR = ".liqvid/thumbs";
const THUMBS_JOB_FILE = "thumbnails-job.json";

interface GenerateThumbsBody {
  colorScheme?: "light" | "dark" | "both";
  cols?: number;
  frequency?: number;
  height?: number;
  imageFormat?: "jpeg" | "png";
  quality?: number;
  rows?: number;
  width?: number;
}

/**
 * Read thumbnail sheets from a directory.
 */
async function readThumbSheets(dir: string): Promise<string[]> {
  try {
    const files = await fsp.readdir(dir);
    return files
      .filter((f) => /^\d+\.(jpeg|png)$/.test(f))
      .sort((a, b) => {
        const numA = Number.parseInt(a, 10);
        const numB = Number.parseInt(b, 10);
        return numA - numB;
      });
  } catch {
    return [];
  }
}

/**
 * Generate thumbnails for a single color scheme.
 */
async function generateForScheme(
  url: string,
  outputDir: string,
  colorScheme: "light" | "dark",
  body: GenerateThumbsBody,
): Promise<string[]> {
  const { config } = getServerState();

  const defaults = ThumbnailOptions.parse(
    config
      .map((config) => config.media?.thumbnails?.defaults ?? {})
      .unwrapOr({}),
  );

  const imageFormat = body.imageFormat ?? defaults?.imageFormat ?? "jpeg";
  const outputPattern = path.join(outputDir, `%s.${imageFormat}`);

  // Ensure output directory exists
  await fsp.mkdir(outputDir, { recursive: true });

  await generateThumbsApi({
    ...defaults,
    ...body,
    colorScheme,
    imageFormat,
    output: outputPattern,
    url,
  });

  return readThumbSheets(outputDir);
}

/**
 * Generate thumbnail sheets for a project.
 */
export async function generateThumbs(
  searchParams: URLSearchParams,
  body: GenerateThumbsBody,
) {
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const { basePath, productionServerPort } = getServerState();
  const projectDir = path.join(process.cwd(), "app", projectPath);
  const thumbsBaseDir = path.join(projectDir, THUMBS_BASE_DIR);

  // Build the URL for the video
  const previewPath = `${basePath || ""}/${projectPath}/`;
  const url = `http://localhost:${productionServerPort}${previewPath}`;

  const colorScheme = body.colorScheme ?? "both";

  try {
    // Ensure thumbs base directory exists
    await fsp.mkdir(thumbsBaseDir, { recursive: true });

    // Resolve options with defaults
    const { config } = getServerState();
    const defaults = ThumbnailOptions.parse(
      config.map((c) => c.media?.thumbnails?.defaults ?? {}).unwrapOr({}),
    );
    const resolvedOptions: ThumbnailsJob = {
      colorScheme,
      cols: body.cols ?? defaults.cols,
      frequency: body.frequency ?? defaults.frequency,
      height: body.height ?? defaults.height,
      imageFormat: body.imageFormat ?? defaults.imageFormat,
      rows: body.rows ?? defaults.rows,
      width: body.width ?? defaults.width,
    };
    if (resolvedOptions.imageFormat === "jpeg") {
      resolvedOptions.quality = body.quality ?? defaults.quality;
    }

    // Save job options to file
    const jobFilePath = path.join(thumbsBaseDir, THUMBS_JOB_FILE);
    await fsp.writeFile(jobFilePath, JSON.stringify(resolvedOptions, null, 2));

    let lightSheets: string[] = [];
    let darkSheets: string[] = [];

    if (colorScheme === "light" || colorScheme === "both") {
      const lightDir = path.join(thumbsBaseDir, "light");
      lightSheets = await generateForScheme(url, lightDir, "light", body);
    }

    if (colorScheme === "dark" || colorScheme === "both") {
      const darkDir = path.join(thumbsBaseDir, "dark");
      darkSheets = await generateForScheme(url, darkDir, "dark", body);
    }

    const numSheets = Math.max(lightSheets.length, darkSheets.length);

    return Response.json({
      dark: darkSheets.length > 0 ? darkSheets : undefined,
      light: lightSheets.length > 0 ? lightSheets : undefined,
      numSheets,
    });
  } catch (error) {
    console.error("Failed to generate thumbs:", error);
    return Response.json(
      { error: "Failed to generate thumbnails" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

/**
 * Read the thumbnail job configuration from a project.
 */
async function readThumbsJob(
  thumbsBaseDir: string,
): Promise<ThumbnailsJob | null> {
  try {
    const jobFilePath = path.join(thumbsBaseDir, THUMBS_JOB_FILE);
    const content = await fsp.readFile(jobFilePath, "utf-8");
    return JSON.parse(content) as ThumbnailsJob;
  } catch {
    return null;
  }
}

/**
 * List existing thumbnail sheets for a project.
 */
export async function listThumbs(searchParams: URLSearchParams) {
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const thumbsBaseDir = path.join(
    process.cwd(),
    "app",
    projectPath,
    THUMBS_BASE_DIR,
  );

  const [lightSheets, darkSheets, job] = await Promise.all([
    readThumbSheets(path.join(thumbsBaseDir, "light")),
    readThumbSheets(path.join(thumbsBaseDir, "dark")),
    readThumbsJob(thumbsBaseDir),
  ]);

  // If no thumbs exist, return null
  if (lightSheets.length === 0 && darkSheets.length === 0) {
    return Response.json(null);
  }

  return Response.json({
    dark: darkSheets,
    job,
    light: lightSheets,
  });
}
