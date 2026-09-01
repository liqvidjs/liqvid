import * as path from "node:path";

import { Effect, FileSystem } from "effect";
import type { RelativePath } from "effect-paths";
import { StatusCodes } from "http-status-codes";

import { InvalidError, NotFoundError } from "../utils/errors.mts";
import { getRoutesDir } from "../utils/misc.mts";

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
 * Example: /api/liqvid/static/projects/my-video/.liqvid/recordings/test/@liqvid.media/audio.webm
 */
export const serveStaticFile = Effect.fnUntraced(function* (
  requestedPath: RelativePath,
) {
  const fs = yield* FileSystem.FileSystem;

  // Security: Prevent directory traversal attacks
  const normalizedPath = path.normalize(requestedPath);
  if (normalizedPath.includes("..")) {
    return yield* new InvalidError({
      message: "invalid path",
    });
  }

  // Resolve relative to the app directory
  const appDir = getRoutesDir();
  const absolutePath = path.join(appDir, normalizedPath);

  // Security: Ensure the resolved path is within the app directory
  if (!absolutePath.startsWith(appDir + path.sep)) {
    return yield* new InvalidError({
      message: "invalid path",
    });
  }

  // Check if file exists
  if (!(yield* fs.exists(absolutePath))) {
    return yield* new NotFoundError({
      message: "file not found",
    });
  }

  // Check if it's a file (not a directory)
  const stat = yield* fs.stat(absolutePath);
  if (stat.type !== "File") {
    return yield* new InvalidError({
      message: "not a file",
    });
  }

  // Read and serve the file
  const content = yield* fs.readFile(absolutePath);
  const mimeType = getMimeType(absolutePath);

  return new Response(content as BodyInit, {
    headers: {
      "Content-Length": String(content.length),
      "Content-Type": mimeType,
    },
    status: StatusCodes.OK,
  });
});
