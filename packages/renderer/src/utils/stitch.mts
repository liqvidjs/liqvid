import path from "node:path";

import { formatTimeMs } from "@liqvid/utils";
import { execa } from "execa";
import parser from "yargs-parser";

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

function splitArgs(combined: string) {
  if (!combined) return [];

  const parsed = parser(combined, {
    configuration: {
      "short-option-groups": false,
    },
  });
  return Object.keys(parsed).reduce((opts, key) => {
    if (key === "_") return opts;
    if (typeof parsed[key] === "boolean") return opts.concat([`-${key}`]);
    return opts.concat([`-${key}`, parsed[key]]);
  }, [] as string[]);
}
