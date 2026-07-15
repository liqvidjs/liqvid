import * as path from "node:path";

import { screenshot } from "@liqvid/cli/screenshot";
import { loadJsonEffect, writeJSON } from "@liqvid/cli/utils";
import { type ScreenshotEntry, ScreenshotMeta } from "@liqvid/schemas/effect";
import { Console, Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";

import { ASSETS_DIR } from "../conventions.mts";
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
  const { cwd } = getServerState();
  return path.join(cwd, "app", projectPath);
}

/**
 * Get the screenshots directory for a project
 */
function getScreenshotsDir(projectPath: string): string {
  return path.join(getProjectDir(projectPath), ASSETS_DIR, "screenshots");
}

/**
 * Generate a datetime-based folder name
 */
function generateFolderName(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
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

                const meta = yield* loadJsonEffect(
                  ScreenshotMeta,
                  path.join(dirname, SCREENSHOT_META_FILE),
                );

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
        }).pipe(
          Effect.catchTag("FileDecodeError", Effect.die),
          Effect.catchTag("PlatformError", Effect.die),
        ),
      )
      // capture a new screenshot
      .handle("capture", ({ payload, query: { projectPath } }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;

          const { basePath, productionServerPort } = getServerState();

          const screenshotsDir = getScreenshotsDir(projectPath);
          const folderId = generateFolderName();
          const folderPath = path.join(screenshotsDir, folderId);

          // Create the folder
          yield* fs.makeDirectory(folderPath, { recursive: true });

          const previewPath = `${basePath || ""}/${projectPath}/`;
          const url = `http://localhost:${productionServerPort}${previewPath}`;

          const colorScheme = payload.colorScheme ?? "light";

          let imagePath: ScreenshotEntry["imagePath"];

          if (colorScheme === "both") {
            // Capture both light and dark screenshots
            const lightOutputPath = path.join(folderPath, "light.png");
            const darkOutputPath = path.join(folderPath, "dark.png");

            yield* Effect.promise(() =>
              screenshot({
                colorScheme: "light",
                height: payload.height,
                output: lightOutputPath,
                time: payload.time,
                url,
                width: payload.width,
              }),
            );

            yield* Console.log("light screenshot succeeded");

            yield* Effect.promise(() =>
              screenshot({
                colorScheme: "dark",
                height: payload.height,
                output: darkOutputPath,
                time: payload.time,
                url,
                width: payload.width,
              }),
            );

            yield* Console.log("dark screenshot succeeded");

            imagePath = {
              dark: `/.liqvid/screenshots/${folderId}/dark.png`,
              light: `/.liqvid/screenshots/${folderId}/light.png`,
            };
          } else {
            // Capture single screenshot
            const outputPath = path.join(folderPath, "screenshot.png");

            yield* Effect.promise(() =>
              screenshot({
                colorScheme,
                height: payload.height,
                output: outputPath,
                time: payload.time,
                url,
                width: payload.width,
              }),
            );

            imagePath = `/.liqvid/screenshots/${folderId}/screenshot.png`;
          }

          // Create metadata
          const meta: ScreenshotMeta = {
            colorScheme,
            createdAt: new Date().toISOString(),
            height: payload.height,
            width: payload.width,
          };

          // Save metadata
          yield* writeJSON(path.join(folderPath, SCREENSHOT_META_FILE), meta);

          return {
            id: folderId,
            imagePath,
            meta,
          };
        }).pipe(
          Effect.catchTags({
            PlatformError: Effect.die,
          }),
        ),
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
            Effect.catchTag("PlatformError", Effect.die),
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
        }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      ),
);
