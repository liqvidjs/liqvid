import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { renderVideo } from "@liqvid/cli/render";
import { StatusCodes } from "http-status-codes";

import { getServerState } from "../initialize.mts";

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
export async function startRender(
  searchParams: URLSearchParams,
  body: StartRenderBody,
) {
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const { productionServerPort } = getServerState();
  const projectDir = path.join(process.cwd(), "app", projectPath);
  const rendersBaseDir = path.join(projectDir, RENDERS_BASE_DIR);

  // Generate unique render ID
  const renderId = generateRenderId();
  const renderDir = path.join(rendersBaseDir, renderId);

  // Ensure render directory exists
  await fsp.mkdir(renderDir, { recursive: true });

  // Build the URL for the video
  const url = `http://localhost:${productionServerPort}/${projectPath}`;

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

  await writeRenderMeta(renderDir, meta);

  // Start render in background (don't await)
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

  return Response.json({ id: renderId });
}

/**
 * List all renders for a project.
 */
export async function listRenders(searchParams: URLSearchParams) {
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const rendersBaseDir = path.join(
    process.cwd(),
    "app",
    projectPath,
    RENDERS_BASE_DIR,
  );

  try {
    const entries = await fsp.readdir(rendersBaseDir, { withFileTypes: true });
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

    return Response.json(renders);
  } catch (error) {
    // Directory doesn't exist
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Response.json([]);
    }
    console.error("Failed to list renders:", error);
    return Response.json(
      { error: "Failed to list renders" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}

interface RenameRenderBody {
  newName: string;
  renderId: string;
}

/**
 * Rename a render (changes the folder name).
 */
export async function renameRender(
  searchParams: URLSearchParams,
  body: RenameRenderBody,
) {
  const projectPath = searchParams.get("projectPath");
  if (!projectPath) {
    return Response.json(
      { error: "projectPath is required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const { renderId, newName } = body;

  // Validate inputs
  if (!renderId || !newName) {
    return Response.json(
      { error: "renderId and newName are required" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  // Sanitize new name (remove path separators and other invalid characters)
  const sanitizedName = newName.replace(/[/\\:*?"<>|]/g, "-").trim();

  if (!sanitizedName) {
    return Response.json(
      { error: "Invalid name" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const rendersBaseDir = path.join(
    process.cwd(),
    "app",
    projectPath,
    RENDERS_BASE_DIR,
  );

  const oldPath = path.join(rendersBaseDir, renderId);
  const newPath = path.join(rendersBaseDir, sanitizedName);

  try {
    // Check if source exists
    await fsp.access(oldPath);

    // Check if destination already exists
    try {
      await fsp.access(newPath);
      return Response.json(
        { error: "A render with this name already exists" },
        { status: StatusCodes.CONFLICT },
      );
    } catch {
      // Destination doesn't exist, which is what we want
    }

    // Rename the directory
    await fsp.rename(oldPath, newPath);

    return Response.json({ newId: sanitizedName });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Response.json(
        { error: "Render not found" },
        { status: StatusCodes.NOT_FOUND },
      );
    }
    console.error("Failed to rename render:", error);
    return Response.json(
      { error: "Failed to rename render" },
      { status: StatusCodes.INTERNAL_SERVER_ERROR },
    );
  }
}
