import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { renderVideo } from "@liqvid/cli/render";
import { Effect, FileSystem } from "effect";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../initialize.mts";
import { ConflictError, NotFoundError } from "../utils/errors.mts";

import type { RenderMeta } from "./contract.mts";

const RENDERS_BASE_DIR = ".liqvid/renders";
const RENDER_META_FILE = "render-meta.json";

interface StartRenderBody {
  colorScheme?: "light" | "dark";
  fps?: number;
  height?: number;
  width?: number;
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
async function readRenderMeta(renderDir: string): Promise<RenderMeta | null> {
  try {
    const metaPath = path.join(renderDir, RENDER_META_FILE);
    const content = await fsp.readFile(metaPath, "utf-8");
    return JSON.parse(content) as RenderMeta;
  } catch {
    return null;
  }
}

/**
 * Write render metadata to a render directory.
 */
async function writeRenderMeta(
  renderDir: string,
  meta: RenderMeta,
): Promise<void> {
  const metaPath = path.join(renderDir, RENDER_META_FILE);
  await fsp.writeFile(metaPath, JSON.stringify(meta, null, 2));
}

/**
 * Start a new video render for a project.
 */
export function startRender(
  searchParams: URLSearchParams,
  body: StartRenderBody,
) {
  return Effect.gen(function* () {
    const projectPath = searchParams.get("projectPath");
    if (!projectPath) {
      return yield* Effect.die({
        message: "projectPath is required",
      });
    }

    const fs = yield* FileSystem.FileSystem;

    const { basePath, productionServerPort } = getServerState();
    const projectDir = path.join(process.cwd(), "app", projectPath);
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
    const colorScheme = body.colorScheme ?? "light";
    const fps = body.fps ?? 30;
    const height = body.height ?? 800;
    const width = body.width ?? 1280;
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

    yield* Effect.promise(() => writeRenderMeta(renderDir, meta));

    // Start render in background (don't await)
    yield* Effect.sync(() => {
      renderVideo({
        colorScheme,
        fps,
        height,
        output,
        url,
        width,
      })
        .then(async (result) => {
          // Update metadata with completed status
          const updatedMeta: RenderMeta = {
            ...meta,
            duration: result.duration,
            status: "completed",
          };
          await writeRenderMeta(renderDir, updatedMeta);
          console.log(`Render ${renderId} completed`);
        })
        .catch(async (error) => {
          // Update metadata with failed status
          const updatedMeta: RenderMeta = {
            ...meta,
            status: "failed",
          };
          await writeRenderMeta(renderDir, updatedMeta);
          console.error(`Render ${renderId} failed:`, error);
        });
    });

    return { id: renderId };
  });
}

/**
 * List all renders for a project.
 */
export function listRenders(searchParams: URLSearchParams) {
  return Effect.gen(function* () {
    const projectPath = searchParams.get("projectPath");
    if (!projectPath) {
      return yield* Effect.die({
        message: "projectPath is required",
      });
    }

    const rendersBaseDir = path.join(
      process.cwd(),
      "app",
      projectPath,
      RENDERS_BASE_DIR,
    );

    return yield* Effect.promise(async () => {
      try {
        const entries = await fsp.readdir(rendersBaseDir, {
          withFileTypes: true,
        });
        const renders: Array<{ id: string; meta: RenderMeta }> = [];

        for (const entry of entries) {
          if (!entry.isDirectory()) continue;

          const renderDir = path.join(rendersBaseDir, entry.name);
          const meta = await readRenderMeta(renderDir);

          if (meta) {
            renders.push({
              id: entry.name,
              meta,
            });
          }
        }

        // Sort by createdAt descending (newest first)
        renders.sort(
          (a, b) =>
            new Date(b.meta.createdAt).getTime() -
            new Date(a.meta.createdAt).getTime(),
        );

        return renders;
      } catch (error) {
        // Directory doesn't exist
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return [];
        }
        throw error;
      }
    });
  });
}

interface RenameRenderBody {
  newName: string;
  renderId: string;
}

/**
 * Rename a render (changes the folder name).
 */
export function renameRender(
  searchParams: URLSearchParams,
  body: RenameRenderBody,
) {
  return Effect.gen(function* () {
    const projectPath = searchParams.get("projectPath");
    if (!projectPath) {
      return yield* Effect.die({
        message: "projectPath is required",
      });
    }

    const { renderId, newName } = body;

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
      process.cwd(),
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
  });
}
