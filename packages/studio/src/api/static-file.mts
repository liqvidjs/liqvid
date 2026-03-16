import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { safeGet } from "have-fun";
import { StatusCodes } from "http-status-codes";

/**
 * MIME type mappings for common file extensions
 */
const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".gif": "image/gif",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".mjs": "application/javascript",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".txt": "text/plain",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

/**
 * Serve static files from the app directory.
 * The `url` param is the path relative to the app directory.
 * Example: /api/liqvid/static?url=/projects/my-video/.liqvid/recordings/test/@liqvid.media/audio.webm
 */
export async function serveStaticFile(
  searchParams: URLSearchParams,
): Promise<Response> {
  const $url = safeGet(searchParams, "url");
  if ($url.isNone) {
    return Response.json(
      { error: "missing url parameter" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  const requestedPath = $url.unwrap();

  // Security: Prevent directory traversal attacks
  const normalizedPath = path.normalize(requestedPath);
  if (normalizedPath.includes("..")) {
    return Response.json(
      { error: "invalid path" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  // Resolve relative to the app directory
  const appDir = path.join(process.cwd(), "app");
  const absolutePath = path.join(appDir, normalizedPath);

  // Security: Ensure the resolved path is within the app directory
  if (!absolutePath.startsWith(appDir + path.sep)) {
    return Response.json(
      { error: "invalid path" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  // Check if file exists
  if (!fs.existsSync(absolutePath)) {
    return Response.json(
      { error: "file not found" },
      { status: StatusCodes.NOT_FOUND },
    );
  }

  // Check if it's a file (not a directory)
  const stat = await fsp.stat(absolutePath);
  if (!stat.isFile()) {
    return Response.json(
      { error: "not a file" },
      { status: StatusCodes.BAD_REQUEST },
    );
  }

  // Read and serve the file
  const content = await fsp.readFile(absolutePath);
  const mimeType = getMimeType(absolutePath);

  return new Response(content, {
    headers: {
      "Content-Length": String(content.length),
      "Content-Type": mimeType,
    },
    status: StatusCodes.OK,
  });
}
