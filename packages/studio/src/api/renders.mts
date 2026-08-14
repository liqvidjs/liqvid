import * as path from "node:path";

import { renderVideo } from "@liqvid/cli/render";
import { loadJson, writeJSON } from "@liqvid/cli/utils";
import { Cause, Effect, Fiber, FileSystem, Option } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { type AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";
import { StatusCodes } from "http-status-codes";

import { ASSETS_DIR, RENDER_META_FILE, RENDERS_DIR } from "../conventions.mts";
import { getServerState } from "../initialize.mts";
import { existenceOptional, readDirWithFileTypes } from "../utils/effect.mts";
import { ConflictError, NotFoundError } from "../utils/errors.mts";
import { createJob } from "../utils/jobs.mts";
import { getConfig, getRenderUrl, getRoutesDir } from "../utils/misc.mts";
import {
  ensureParamsMarker,
  extractParameterNames,
  getParameterizedAssetsDir,
} from "../utils/parameters.mts";

import { WebApi } from "./contract.mts";
import { RenderMeta } from "./schemas.mts";

/**
 * Generate a unique job name for a render.
 */
function renderJobName(projectPath: string, renderId: string): string {
  return `render:${projectPath}:${renderId}`;
}

/**
 * Generate a unique render ID based on current datetime.
 */
function generateRenderId(): string {
  const now = new Date();
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

/**
 * Read render metadata from a render directory.
 */
function readRenderMeta(renderDir: AbsoluteDir) {
  return loadJson(RenderMeta, path.join(renderDir, RENDER_META_FILE));
}

/**
 * Write render metadata to a render directory.
 */
function writeRenderMeta(renderDir: AbsoluteDir, meta: RenderMeta) {
  const metaPath = path.join(renderDir, RENDER_META_FILE);
  return writeJSON(metaPath, meta);
}

export const rendersLive = HttpApiBuilder.group(WebApi, "renders", (handlers) =>
  handlers
    .handle("list", ({ query: { projectPath, params: paramsJson } }) =>
      Effect.gen(function* () {
        // Parse params if provided
        const params = paramsJson
          ? (JSON.parse(paramsJson) as Record<string, string>)
          : undefined;

        const routesDir = getRoutesDir();
        const assetsDir = getParameterizedAssetsDir(
          routesDir as AbsoluteDir,
          projectPath,
          params,
        );

        const rendersBaseDir = path.join(assetsDir, RENDERS_DIR);

        const entries = yield* readDirWithFileTypes(rendersBaseDir).pipe(
          Effect.catchReason("PlatformError", "NotFound", () =>
            Effect.succeed([]),
          ),
        );
        const renders: Array<{ id: string; meta: RenderMeta }> = [];

        for (const entry of entries) {
          if (entry[1] !== "Directory") continue;
          const basename = entry[0];

          const renderDir = path.join(rendersBaseDir, basename);
          const $meta =
            yield* readRenderMeta(renderDir).pipe(existenceOptional);

          if (Option.isSome($meta)) {
            renders.push({ id: basename, meta: $meta.value });
          }
        }

        // Sort by createdAt descending (newest first)
        renders.sort(
          (a, b) =>
            new Date(b.meta.createdAt).getTime() -
            new Date(a.meta.createdAt).getTime(),
        );

        return renders;
      }).pipe(
        Effect.catchTag("PlatformError", Effect.die),
        Effect.catchTag("FileDecodeError", Effect.die),
      ),
    )
    .handle("rename", ({ query: { projectPath, params: paramsJson }, payload }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const { renderId, newName } = payload;

        // Validate inputs
        if (!renderId || !newName) {
          return yield* Effect.die({
            message: "renderId and newName are required",
            status: StatusCodes.BAD_REQUEST,
          });
        }

        // Sanitize new name (remove path separators and other invalid characters)
        const sanitizedName = newName.replace(/[/\\:*?"<>|]/g, "-").trim();

        if (!sanitizedName) {
          return yield* Effect.die({
            message: "Invalid name",
            status: StatusCodes.BAD_REQUEST,
          });
        }

        // Parse params if provided
        const params = paramsJson
          ? (JSON.parse(paramsJson) as Record<string, string>)
          : undefined;

        const routesDir = getRoutesDir();
        const assetsDir = getParameterizedAssetsDir(
          routesDir as AbsoluteDir,
          projectPath,
          params,
        );

        const rendersBaseDir = path.join(assetsDir, RENDERS_DIR);

        const oldPath = path.join(rendersBaseDir, RelativeDir(renderId));
        const newPath = path.join(rendersBaseDir, RelativeDir(sanitizedName));

        // Check if source exists
        if (!(yield* fs.exists(oldPath))) {
          return yield* new NotFoundError({
            message: "render not found",
          });
        }

        // Check if destination already exists
        if (yield* fs.exists(newPath)) {
          return yield* new ConflictError({
            message: "a render with this name already exists",
          });
        }

        // Rename the directory
        yield* fs.rename(oldPath, newPath);

        return { newId: sanitizedName };
      }).pipe(Effect.catchTag("PlatformError", Effect.die)),
    )
    .handle("start", ({ query: { projectPath }, payload }) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;

        const config = yield* getConfig();
        const routesDir = getRoutesDir();

        // Ensure params marker exists for parameterized projects
        const paramNames = extractParameterNames(projectPath);
        if (paramNames.length > 0) {
          const baseAssetsDir = path.join(routesDir, projectPath, ASSETS_DIR);
          yield* ensureParamsMarker(baseAssetsDir as AbsoluteDir, projectPath);
        }

        const assetsDir = getParameterizedAssetsDir(
          routesDir as AbsoluteDir,
          projectPath,
          payload.params,
        );

        const rendersBaseDir = path.join(assetsDir, RENDERS_DIR);

        // Generate unique render ID
        const renderId = generateRenderId();
        const renderDir = path.join(rendersBaseDir, RelativeDir(renderId));

        // Ensure render directory exists
        yield* fs.makeDirectory(renderDir, { recursive: true });

        const renderSource = config?.media?.renders?.source ?? "preview";

        const url = yield* getRenderUrl(renderSource, projectPath);

        // Apply defaults
        const colorScheme = payload.colorScheme ?? "light";
        const fps = payload.fps ?? 30;
        const height = payload.height ?? 800;
        const width = payload.width ?? 1280;
        const output = path.join(renderDir, RelativeFile("video.mp4"));

        // Create initial metadata
        const meta: RenderMeta = {
          colorScheme,
          createdAt: new Date().toISOString(),
          fps,
          height,
          output: "video.mp4",
          status: "rendering",
          width,
        };

        const fiber = Effect.gen(function* () {
          yield* writeRenderMeta(renderDir, meta);

          const result = yield* renderVideo({
            colorScheme,
            fps,
            height,
            output,
            url,
            width,
          });

          // Update metadata with completed status
          const updatedMeta: RenderMeta = {
            ...meta,
            duration: result.duration,
            status: "completed",
          };

          yield* writeRenderMeta(renderDir, updatedMeta);
          yield* Effect.log(`render ${renderId} completed`);
        }).pipe(
          Effect.catch((error) =>
            Effect.gen(function* () {
              // Update metadata with failed status
              const updatedMeta: RenderMeta = {
                ...meta,
                status: "failed",
              };
              yield* writeRenderMeta(renderDir, updatedMeta);
              yield* Effect.logError(`render ${renderId} failed:`, error);
            }),
          ),
        );

        // Start render in background (don't await)
        yield* createJob(renderJobName(projectPath, renderId), fiber, {
          path: projectPath,
        });

        return { id: renderId };
      }).pipe(
        Effect.annotateLogs({ payload, projectPath }),
        Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause))),
        Effect.catchTag("PlatformError", Effect.die),
      ),
    )
    // delete a render (removes the folder and cancels any running job)
    .handle(
      "delete",
      ({
        payload: { renderId },
        query: { projectPath, params: paramsJson },
      }) =>
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;

          // Parse params if provided
          const params = paramsJson
            ? (JSON.parse(paramsJson) as Record<string, string>)
            : undefined;

          const routesDir = getRoutesDir();
          const assetsDir = getParameterizedAssetsDir(
            routesDir as AbsoluteDir,
            projectPath,
            params,
          );

          const rendersBaseDir = path.join(assetsDir, RENDERS_DIR);
          const folderPath = path.join(rendersBaseDir, RelativeDir(renderId));

          // Check if the render exists
          if (!(yield* fs.exists(folderPath))) {
            return yield* new NotFoundError({
              message: "Render not found",
            });
          }

          // Cancel any running job for this render
          const { jobs } = getServerState();
          const jobName = renderJobName(projectPath, renderId);
          for (const job of jobs.new.values()) {
            if (job.name === jobName && job.state === "running") {
              yield* Fiber.interrupt(job.fiber);
              break;
            }
          }

          // Remove the directory recursively
          yield* fs.remove(folderPath, { recursive: true });

          return { success: true };
        }).pipe(Effect.catchTag("PlatformError", Effect.die)),
    ),
);
