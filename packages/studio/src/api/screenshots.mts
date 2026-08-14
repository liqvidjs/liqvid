import * as path from "node:path";

import { screenshot } from "@liqvid/cli/screenshot";
import { loadJson, writeJSON } from "@liqvid/cli/utils";
import { type ScreenshotEntry, ScreenshotMeta } from "@liqvid/schemas";
import { assertType } from "@liqvid/utils";
import { Effect, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";

import {
  ASSETS_DIR,
  SCREENSHOT_FILE_DARK,
  SCREENSHOT_FILE_LIGHT,
  SCREENSHOT_FILE as SCREENSHOT_PNG,
  SCREENSHOTS_DIR,
} from "../conventions.mts";
import { existenceOptional, readDirWithFileTypes } from "../utils/effect.mts";
import {
  ConflictError,
  InvalidError,
  NotFoundError,
} from "../utils/errors.mts";
import { getConfig, getRenderUrl, getRoutesDir } from "../utils/misc.mts";
import {
  ensureParamsMarker,
  extractParameterNames,
  getParameterizedAssetsDir,
} from "../utils/parameters.mts";

import { WebApi } from "./contract.mts";

const SCREENSHOT_META_FILE = RelativeFile("screenshot-meta.json");

/**
 * Get the screenshots directory for a project
 */
function getScreenshotsDir(
  projectPath: RelativeDir,
  params?: Record<string, string>,
) {
  const routesDir = getRoutesDir();
  const assetsDir = getParameterizedAssetsDir(
    routesDir as AbsoluteDir,
    projectPath,
    params,
  );
  return path.join(assetsDir, SCREENSHOTS_DIR);
}

/**
 * Generate a datetime-based folder name
 */
function generateFolderName(): RelativeDir {
  const now = new Date();
  return RelativeDir(now.toISOString().replace(/[:.]/g, "-"));
}

export const screenshotsLive = HttpApiBuilder.group(
  WebApi,
  "screenshots",
  (handlers) =>
    handlers
      // list existing screenshots for a project
      .handle("list", ({ query: { projectPath, params: paramsJson } }) =>
        Effect.gen(function* () {
          // Parse params if provided
          const params = paramsJson
            ? (JSON.parse(paramsJson) as Record<string, string>)
            : undefined;

          const screenshotsDir = getScreenshotsDir(projectPath, params);

          // Build the relative path prefix for image paths
          const paramNames = extractParameterNames(projectPath);
          let imagePathPrefix: RelativeDir = ASSETS_DIR;
          if (paramNames.length > 0 && params) {
            const paramSubpath = paramNames.map((n) =>
              RelativeDir(params[n] ?? ""),
            );
            imagePathPrefix = path.join(ASSETS_DIR, ...paramSubpath);
          }

          const fs = yield* FileSystem.FileSystem;

          const entries = (yield* readDirWithFileTypes(screenshotsDir).pipe(
            existenceOptional,
          )).pipe(Option.getOrElse(() => []));
          const screenshots: ScreenshotEntry[] = [];

          yield* Effect.all(
            entries.map(([name, kind]) =>
              Effect.gen(function* () {
                if (kind !== "Directory") return;

                const dirname = path.join(screenshotsDir, name);

                const meta = yield* loadJson(
                  ScreenshotMeta,
                  path.join(dirname, SCREENSHOT_META_FILE),
                );

                const prefix = path.join(
                  imagePathPrefix,
                  SCREENSHOTS_DIR,
                  name,
                );

                // Determine image path based on colorScheme
                let imagePath: ScreenshotEntry["imagePath"];
                if (meta.colorScheme === "both") {
                  imagePath = {
                    dark: path.join(prefix, SCREENSHOT_FILE_DARK),
                    light: path.join(prefix, SCREENSHOT_FILE_LIGHT),
                  };
                } else {
                  imagePath = path.join(prefix, SCREENSHOT_PNG);
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

          const config = yield* getConfig();
          const routesDir = getRoutesDir();

          // Ensure params marker exists for parameterized projects
          const paramNames = extractParameterNames(projectPath);
          if (paramNames.length > 0) {
            const baseAssetsDir = path.join(routesDir, projectPath, ASSETS_DIR);
            yield* ensureParamsMarker(
              baseAssetsDir as AbsoluteDir,
              projectPath,
            );
          }

          const screenshotsDir = getScreenshotsDir(projectPath, payload.params);
          const folderId = generateFolderName();
          const folderPath = path.join(screenshotsDir, folderId);

          // Create the folder
          yield* fs.makeDirectory(folderPath, { recursive: true });

          const renderSource = config.media?.screenshots?.source ?? "preview";

          const url = yield* getRenderUrl(renderSource, projectPath);

          const colorScheme = payload.colorScheme ?? "light";

          // Build the relative path prefix for image paths
          let imagePathPrefix: RelativeDir = ASSETS_DIR;
          if (paramNames.length > 0 && payload.params) {
            const paramSubpath = paramNames.map((name) =>
              RelativeDir(payload.params![name] ?? ""),
            );
            imagePathPrefix = path.join(ASSETS_DIR, ...paramSubpath);
          }

          let imagePath: ScreenshotEntry["imagePath"];

          if (colorScheme === "both") {
            // Capture both light and dark screenshots
            const lightOutputPath = path.join(
              folderPath,
              SCREENSHOT_FILE_LIGHT,
            );
            const darkOutputPath = path.join(folderPath, SCREENSHOT_FILE_DARK);

            payload;

            yield* Effect.all([
              screenshot({
                ...payload,
                colorScheme: "light",
                output: lightOutputPath,
                url,
              }).pipe(
                Effect.andThen(Effect.logDebug("light screenshot succeeded")),
              ),

              screenshot({
                ...payload,
                colorScheme: "dark",
                output: darkOutputPath,
                url,
              }).pipe(
                Effect.andThen(Effect.logDebug("dark screenshot succeeded")),
              ),
            ]);

            imagePath = {
              dark: path.join(
                imagePathPrefix,
                SCREENSHOTS_DIR,
                folderId,
                SCREENSHOT_FILE_DARK,
              ),
              light: path.join(
                imagePathPrefix,
                SCREENSHOTS_DIR,
                folderId,
                SCREENSHOT_FILE_LIGHT,
              ),
            };
          } else {
            // Capture single screenshot
            const outputPath = path.join(folderPath, SCREENSHOT_PNG);

            yield* screenshot({
              ...payload,
              colorScheme,
              output: outputPath,
              url,
            });

            imagePath = path.join(
              imagePathPrefix,
              SCREENSHOTS_DIR,
              RelativeDir(folderId),
              SCREENSHOT_PNG,
            );
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
          Effect.annotateLogs({
            ...payload,
            projectPath,
          }),
          Effect.catchTags({
            PlatformError: Effect.die,
            UnknownError: Effect.die,
          }),
        ),
      )
      // copy a screenshot to the project root
      .handle(
        "copy",
        ({
          payload: { screenshotId, sourceFilename, targetFilename },
          query: { projectPath, params: paramsJson },
        }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            const projectDir = path.join(getRoutesDir(), projectPath);
            const screenshotsDir = getScreenshotsDir(projectPath, params);
            const sourcePath = path.join(
              screenshotsDir,
              RelativeDir(screenshotId),
              sourceFilename ? RelativeFile(sourceFilename) : SCREENSHOT_PNG,
            );
            const targetPath = path.join(
              projectDir,
              RelativeFile(targetFilename),
            );

            yield* fs.copyFile(sourcePath, targetPath);
          }).pipe(
            Effect.as({ success: true }),
            Effect.catchTag("PlatformError", Effect.die),
          ),
      )
      // rename a screenshot (changes the folder name)
      .handle(
        "rename",
        ({
          payload: { newName, screenshotId },
          query: { projectPath, params: paramsJson },
        }) =>
          Effect.gen(function* () {
            // Sanitize new name (remove path separators and invalid chars)
            const sanitizedName = newName.replace(/[/\\:*?"<>|]/g, "-").trim();

            if (!sanitizedName) {
              return yield* new InvalidError({ message: "Invalid name" });
            }

            const fs = yield* FileSystem.FileSystem;

            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            const screenshotsDir = getScreenshotsDir(projectPath, params);
            const oldPath = path.join(
              screenshotsDir,
              RelativeDir(screenshotId),
            );
            const newPath = path.join(
              screenshotsDir,
              RelativeDir(sanitizedName),
            );

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
        ({
          payload: { screenshotId },
          query: { projectPath, params: paramsJson },
        }) =>
          Effect.gen(function* () {
            const fs = yield* FileSystem.FileSystem;

            // Parse params if provided
            const params = paramsJson
              ? (JSON.parse(paramsJson) as Record<string, string>)
              : undefined;

            const screenshotsDir = getScreenshotsDir(projectPath, params);
            const folderPath = path.join(
              screenshotsDir,
              RelativeDir(screenshotId),
            );

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
          assertType<RelativeFile>(filename);
          const fs = yield* FileSystem.FileSystem;

          const filePath = path.join(getRoutesDir(), projectPath, filename);

          return {
            exists: yield* fs.exists(filePath),
          };
        }).pipe(Effect.catchTag("PlatformError", Effect.die)),
      ),
);
