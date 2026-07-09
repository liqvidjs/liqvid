import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { screenshot } from "@liqvid/cli/screenshot";
import type {
  ColorSchemeOption,
  ScreenshotEntry,
  ScreenshotMeta,
} from "@liqvid/schemas/screenshot-meta";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { getServerState } from "../initialize.mts";
import { existenceOptional } from "../utils/effect.mts";
import {
  ConflictError,
  InvalidError,
  NotFoundError,
} from "../utils/errors.mts";

import { WebApi } from "./contract.mts";

const SCREENSHOT_META_FILE = "screenshot-meta.json";

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
    path.join(folderPath, SCREENSHOT_META_FILE),
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
) {
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

export const screenshotsLive = HttpApiBuilder.group(
  WebApi,
  "screenshots",
  (handlers) =>
    handlers
      // list existing screenshots for a project
      .handle("list", ({ query: { projectPath } }) =>
        Effect.gen(function* () {
          const screenshotsDir = getScreenshotsDir(projectPath);

          const fs = yield* FileSystem.FileSystem;

          const entries = (yield* fs
            .readDirectory(screenshotsDir)
            .pipe(existenceOptional)).pipe(
            Option.getOrElse(() => [] as string[]),
          );
          const screenshots: ScreenshotEntry[] = [];

          yield* Effect.all(
            entries.map((name) =>
              Effect.gen(function* () {
                const dirname = path.join(screenshotsDir, name);

                const stats = yield* fs.stat(dirname);
                if (stats.type !== "Directory") return;

                const metaPath = path.join(dirname, SCREENSHOT_META_FILE);

                const metaContent = yield* fs.readFileString(metaPath, "utf8");
                const meta = JSON.parse(metaContent) as ScreenshotMeta;

                // Determine image path based on colorScheme
                let imagePath: ScreenshotEntry["imagePath"];
                if (meta.colorScheme === "both") {
                  imagePath = {
                    dark: `/.liqvid/screenshots/${name}/dark.png`,
                    light: `/.liqvid/screenshots/${name}/light.png`,
                  };
                } else {
                  imagePath = `/.liqvid/screenshots/${name}/screenshot.png`;
                }

                screenshots.push({ id: name, imagePath, meta });
              }),
            ),
            { concurrency: 10 },
          );

          // Sort by creation date, newest first
          screenshots.sort(
            (a, b) =>
              new Date(b.meta.createdAt).getTime() -
              new Date(a.meta.createdAt).getTime(),
          );

          return screenshots;
        }).pipe(Effect.catchTag("PlatformError", Effect.orDie)),
      )
      // capture a new screenshot
      .handle("capture", ({ payload, query: { projectPath } }) =>
        Effect.promise(() => captureScreenshot(projectPath, payload)),
      )
      // copy a screenshot to the project root
      .handle(
        "copy",
        ({
          payload: { screenshotId, sourceFilename, targetFilename },
          query: { projectPath },
        }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            const projectDir = getProjectDir(projectPath);
            const screenshotsDir = getScreenshotsDir(projectPath);
            const sourcePath = path.join(
              screenshotsDir,
              screenshotId,
              sourceFilename ?? "screenshot.png",
            );
            const targetPath = path.join(projectDir, targetFilename);

            yield* fs.copyFile(sourcePath, targetPath);
          }).pipe(
            Effect.as({ success: true }),
            Effect.catchTag("PlatformError", Effect.orDie),
          ),
      )
      // rename a screenshot (changes the folder name)
      .handle(
        "rename",
        ({ payload: { newName, screenshotId }, query: { projectPath } }) =>
          Effect.gen(function* () {
            // Sanitize new name (remove path separators and invalid chars)
            const sanitizedName = newName.replace(/[/\\:*?"<>|]/g, "-").trim();

            if (!sanitizedName) {
              return yield* new InvalidError({ message: "Invalid name" });
            }

            const fs = yield* FileSystem.FileSystem;

            const screenshotsDir = getScreenshotsDir(projectPath);
            const oldPath = path.join(screenshotsDir, screenshotId);
            const newPath = path.join(screenshotsDir, sanitizedName);

            // Check if source exists
            if (!(yield* fs.exists(oldPath))) {
              return yield* new NotFoundError({
                message: "Screenshot not found",
              });
            }

            // Check if destination already exists
            if (yield* fs.exists(newPath)) {
              return yield* new ConflictError({
                message: "A screenshot with this name already exists",
              });
            }

            // Rename the directory
            yield* fs.rename(oldPath, newPath);

            return { newId: sanitizedName };
          }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      )
      // delete a screenshot (removes the folder)
      .handle(
        "delete",
        ({ payload: { screenshotId }, query: { projectPath } }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            const screenshotsDir = getScreenshotsDir(projectPath);
            const folderPath = path.join(screenshotsDir, screenshotId);

            // Check if the screenshot exists
            if (!(yield* fs.exists(folderPath))) {
              return yield* new NotFoundError({
                message: "Screenshot not found",
              });
            }

            // Remove the directory recursively
            yield* fs.remove(folderPath, { recursive: true });

            return { success: true };
          }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      )
      // check whether a project image (opengraph/twitter) exists
      .handle("checkExists", ({ query: { filename, projectPath } }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;

          const filePath = path.join(getProjectDir(projectPath), filename);

          return {
            exists: yield* fs.exists(filePath),
          };
        }).pipe(Effect.catchTag("PlatformError", Effect.orDie)),
      ),
);
