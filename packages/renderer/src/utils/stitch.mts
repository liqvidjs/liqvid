import path from "node:path";

import { formatTimeMs } from "@liqvid/utils";
import { execa } from "execa";

/**
  Stitch frames together into a video.
*/
export function stitch({
  audioArgs,
  audioFile,
  duration,
  fps,
  framesDir,
  pattern,
  output,
  pixelFormat,
  signal,
  start = 0,
  videoArgs,
}: {
  audioArgs: string;
  audioFile: string | undefined;
  duration: number;
  fps: number;
  framesDir: string;
  pattern: string;
  output: string;
  pixelFormat: string;
  signal: AbortSignal;
  start?: number;
  videoArgs: string;
}) {
  /* images */
  const args = [
    // framerate
    "-framerate",
    String(fps),

    // frames
    "-i",
    path.join(framesDir, pattern),
  ];

  /* audio */
  if (audioFile) {
    args.push(
      // start time
      "-ss",
      formatTimeMs(start),

      // duration
      "-t",
      formatTimeMs(duration),

      // audio args
      ...splitArgs(audioArgs),

      // audio file
      "-i",
      audioFile,
    );
  }

  /* video */
  args.push(
    // pixel format
    "-pix_fmt",
    pixelFormat,

    // force overwrite
    "-y",

    // video args
    ...splitArgs(videoArgs),

    output,
  );

  return execa({ cancelSignal: signal, gracefulCancel: true })(
    "ffmpeg",
    args.filter(Boolean),
  );
}

/**
 * Split a combined argument string into individual arguments, handling quoting.
 *
 * Supports single quotes, double quotes, and backslash escaping.
 * e.g. `-c:a copy -vn` -> ["-c:a", "copy", "-vn"]
 */
function splitArgs(combined: string): string[] {
  if (!combined) return [];

  const args: string[] = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (const ch of combined) {
    if (escaped) {
      current += ch;
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (current.length > 0) {
        args.push(current);
        current = "";
      }
      continue;
    }

    current += ch;
  }

  if (current.length > 0) {
    args.push(current);
  }

  return args;
}
