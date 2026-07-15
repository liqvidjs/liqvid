import * as path from "node:path";

import { renderVideo } from "@liqvid/cli/render";
import { loadJsonEffect, Progress, writeJSON } from "@liqvid/cli/utils";
import { Effect, FileSystem, Option, type PlatformError } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../initialize.mts";
import {
  existenceOptional,
  jobProgressLayer,
  readDirWithFileTypes,
} from "../utils/effect.mts";
import { ConflictError, NotFoundError } from "../utils/errors.mts";
import { createJob } from "../utils/jobs.mts";

import { WebApi } from "./contract.mts";
import type { LoggableJob } from "./schemas.mts";
import { RenderMeta } from "./schemas.mts";

const RENDER_META_FILE = "render-meta.json";
const RENDERS_BASE_DIR = ".liqvid/renders";

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
function readRenderMeta(renderDir: string) {
  return loadJsonEffect(RenderMeta, path.join(renderDir, RENDER_META_FILE));
}

/**
 * Write render metadata to a render directory.
 */
function writeRenderMeta(renderDir: string, meta: RenderMeta) {
  const metaPath = path.join(renderDir, RENDER_META_FILE);
  return writeJSON(metaPath, meta);
}

export const rendersLive = HttpApiBuilder.group(WebApi, "renders", (handlers) =>
  handlers
    .handle("list", ({ query: { projectPath } }) =>
      Effect.gen(function* () {
        const { cwd } = getServerState();
        const rendersBaseDir = path.join(
          cwd,
          "app",
          projectPath,
          RENDERS_BASE_DIR,
        );

        const entries = yield* readDirWithFileTypes(rendersBaseDir).pipe(
          Effect.catchReason("PlatformError", "NotFound", () =>
            Effect.succeed([]),
          ),
        );
        const renders: Array<{ id: string; meta: RenderMeta }> = [];

        for (const [basename, stats] of entries) {
          if (stats.type !== "Directory") continue;

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
    .handle("rename", ({ query: { projectPath }, payload }) =>
      Effect.gen(function* () {
        const { cwd } = getServerState();
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

        const fs = yield* FileSystem.FileSystem;

        const rendersBaseDir = path.join(
          cwd,
          "app",
          projectPath,
          RENDERS_BASE_DIR,
        );

        const oldPath = path.join(rendersBaseDir, renderId);
        const newPath = path.join(rendersBaseDir, sanitizedName);

        // Check if source exists
        if (!(yield* fs.exists(oldPath))) {
          return yield* new NotFoundError({
            message: "render not found",
          });
        }

        // Check if destination already exists
        if (yield* fs.exists(newPath)) {
          return yield* new ConflictError({
            message: "A render with this name already exists",
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

        const { basePath, cwd, productionServerPort } = getServerState();
        const projectDir = path.join(cwd, "app", projectPath);
        const rendersBaseDir = path.join(projectDir, RENDERS_BASE_DIR);

        // Generate unique render ID
        const renderId = generateRenderId();
        const renderDir = path.join(rendersBaseDir, renderId);

        // Ensure render directory exists
        yield* fs.makeDirectory(renderDir, { recursive: true });

        // Build the URL for the video
        const previewPath = basePath
          ? `${basePath}/${projectPath}`
          : `/${projectPath}`;
        const url = `http://localhost:${productionServerPort}${previewPath}`;

        // Apply defaults
        const colorScheme = payload.colorScheme ?? "light";
        const fps = payload.fps ?? 30;
        const height = payload.height ?? 800;
        const width = payload.width ?? 1280;
        const output = path.join(renderDir, "video.mp4");

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
          yield* Effect.log(`Render ${renderId} completed`);
        }).pipe(
          Effect.catch((error) =>
            Effect.gen(function* () {
              // Update metadata with failed status
              const updatedMeta: RenderMeta = {
                ...meta,
                status: "failed",
              };
              yield* writeRenderMeta(renderDir, updatedMeta);
              yield* Effect.logError(`Render ${renderId} failed:`, error);
            }),
          ),
        );

        // Start render in background (don't await)
        const job: LoggableJob<void, PlatformError.PlatformError> =
          yield* createJob("render", fiber).pipe(
            Effect.provideServiceEffect(
              Progress,
              Effect.suspend(() => Effect.succeed(jobProgressLayer(job))),
            ),
          );

        return { id: renderId };
      }).pipe(Effect.catchTag("PlatformError", Effect.die)),
    ),
);
