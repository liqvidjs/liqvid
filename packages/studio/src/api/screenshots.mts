import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { screenshot } from "@liqvid/cli/screenshot";
import type {
  ColorSchemeOption,
  ScreenshotEntry,
  ScreenshotMeta,
} from "@liqvid/schemas/screenshot-meta";

import { getServerState } from "../initialize.mts";

/**
 * Get the project directory from a project path.
 * The project path is relative to the app/ directory.
 */
function getProjectDir(projectPath: string): string {
  return path.join(process.cwd(), "app", projectPath);
}

/**
 * Get the screenshots directory for a project
 */
function getScreenshotsDir(projectPath: string): string {
  return path.join(getProjectDir(projectPath), ".liqvid", "screenshots");
}

/**
 * Generate a datetime-based folder name
 */
function generateFolderName(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

/**
 * List all screenshots for a project
 */
export async function listScreenshots(
  projectPath: string,
): Promise<ScreenshotEntry[]> {
  const screenshotsDir = getScreenshotsDir(projectPath);

  try {
    const entries = await fsp.readdir(screenshotsDir, { withFileTypes: true });
    const screenshots: ScreenshotEntry[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const metaPath = path.join(
        screenshotsDir,
        entry.name,
        "screenshot-meta.json",
      );

      try {
        const metaContent = await fsp.readFile(metaPath, "utf8");
        const meta = JSON.parse(metaContent) as ScreenshotMeta;

        // Determine image path based on colorScheme
        let imagePath: ScreenshotEntry["imagePath"];
        if (meta.colorScheme === "both") {
          imagePath = {
            dark: `/.liqvid/screenshots/${entry.name}/dark.png`,
            light: `/.liqvid/screenshots/${entry.name}/light.png`,
          };
        } else {
          imagePath = `/.liqvid/screenshots/${entry.name}/screenshot.png`;
        }

        screenshots.push({
          id: entry.name,
          imagePath,
          meta,
        });
      } catch {
        // Skip folders without valid metadata
      }
    }

    // Sort by creation date, newest first
    screenshots.sort(
      (a, b) =>
        new Date(b.meta.createdAt).getTime() -
        new Date(a.meta.createdAt).getTime(),
    );

    return screenshots;
  } catch {
    // Directory doesn't exist yet
    return [];
  }
}

/**
 * Capture a screenshot using @liqvid/renderer
 */
export async function captureScreenshot(
  projectPath: string,
  options: {
    time: number;
    width: number;
    height: number;
    colorScheme?: ColorSchemeOption;
  },
): Promise<ScreenshotEntry> {
  const { basePath, productionServerPort } = getServerState();

  const screenshotsDir = getScreenshotsDir(projectPath);
  const folderId = generateFolderName();
  const folderPath = path.join(screenshotsDir, folderId);

  // Create the folder
  await fsp.mkdir(folderPath, { recursive: true });

  const previewPath = `${basePath || ""}/${projectPath}/`;
  const url = `http://localhost:${productionServerPort}${previewPath}`;

  const colorScheme = options.colorScheme ?? "light";

  let imagePath: ScreenshotEntry["imagePath"];

  if (colorScheme === "both") {
    // Capture both light and dark screenshots
    const lightOutputPath = path.join(folderPath, "light.png");
    const darkOutputPath = path.join(folderPath, "dark.png");

    console.log({ darkOutputPath, lightOutputPath });

    await screenshot({
      colorScheme: "light",
      height: options.height,
      output: lightOutputPath,
      time: options.time,
      url,
      width: options.width,
    });

    console.log("light screenshot succeeded");

    await screenshot({
      colorScheme: "dark",
      height: options.height,
      output: darkOutputPath,
      time: options.time,
      url,
      width: options.width,
    });

    console.log("dark screenshot succeeded");

    imagePath = {
      dark: `/.liqvid/screenshots/${folderId}/dark.png`,
      light: `/.liqvid/screenshots/${folderId}/light.png`,
    };
  } else {
    // Capture single screenshot
    const outputPath = path.join(folderPath, "screenshot.png");

    await screenshot({
      colorScheme,
      height: options.height,
      output: outputPath,
      time: options.time,
      url,
      width: options.width,
    });

    imagePath = `/.liqvid/screenshots/${folderId}/screenshot.png`;
  }

  // Create metadata
  const meta: ScreenshotMeta = {
    colorScheme,
    createdAt: new Date().toISOString(),
    height: options.height,
    width: options.width,
  };

  // Save metadata
  await fsp.writeFile(
    path.join(folderPath, "screenshot-meta.json"),
    JSON.stringify(meta, null, 2),
  );

  return {
    id: folderId,
    imagePath,
    meta,
  };
}

/**
 * Copy a screenshot to the project root as opengraph or twitter image
 */
export async function copyScreenshotToRoot(
  projectPath: string,
  screenshotId: string,
  targetFilename: "opengraph-image.png" | "twitter-image.png",
  sourceFilename?: "light.png" | "dark.png",
): Promise<void> {
  const projectDir = getProjectDir(projectPath);
  const screenshotsDir = getScreenshotsDir(projectPath);
  const sourcePath = path.join(
    screenshotsDir,
    screenshotId,
    sourceFilename ?? "screenshot.png",
  );
  const targetPath = path.join(projectDir, targetFilename);

  await fsp.copyFile(sourcePath, targetPath);
}

/**
 * Check if an image file exists in the project root
 */
export async function checkImageExists(
  projectPath: string,
  filename: "opengraph-image.png" | "twitter-image.png",
): Promise<boolean> {
  const filePath = path.join(getProjectDir(projectPath), filename);

  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * API route handlers
 */
export async function handleListScreenshots(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const projectPath = url.searchParams.get("projectPath");

  if (!projectPath) {
    return Response.json({ error: "projectPath is required" }, { status: 400 });
  }

  const screenshots = await listScreenshots(projectPath);
  return Response.json(screenshots);
}

export async function handleCaptureScreenshot(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const projectPath = url.searchParams.get("projectPath");

  if (!projectPath) {
    return Response.json({ error: "projectPath is required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      colorScheme?: ColorSchemeOption;
      height: number;
      time: number;
      width: number;
    };

    console.log({ body });

    const screenshotResult = await captureScreenshot(projectPath, body);
    return Response.json(screenshotResult);
  } catch (e) {
    console.error("Failed to capture screenshot:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function handleCopyScreenshot(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const projectPath = url.searchParams.get("projectPath");

  if (!projectPath) {
    return Response.json({ error: "projectPath is required" }, { status: 400 });
  }

  try {
    const body = (await request.json()) as {
      screenshotId: string;
      sourceFilename?: "light.png" | "dark.png";
      targetFilename: "opengraph-image.png" | "twitter-image.png";
    };

    await copyScreenshotToRoot(
      projectPath,
      body.screenshotId,
      body.targetFilename,
      body.sourceFilename,
    );
    return Response.json({ success: true });
  } catch (e) {
    console.error("Failed to copy screenshot:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function handleCheckImageExists(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const projectPath = url.searchParams.get("projectPath");
  const filename = url.searchParams.get("filename") as
    | "opengraph-image.png"
    | "twitter-image.png"
    | null;

  if (!projectPath || !filename) {
    return Response.json(
      { error: "projectPath and filename are required" },
      { status: 400 },
    );
  }

  const exists = await checkImageExists(projectPath, filename);
  return Response.json({ exists });
}
