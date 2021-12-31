import execa from "execa";
import path from "path";
import parser from "yargs-parser";

import {formatTimeMs} from "@liqvid/utils/time";

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
  start,
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
    path.join(framesDir, pattern)
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
      audioFile
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

    output
  );
  return execa("ffmpeg", args.filter(Boolean));
}

// fuck
function splitArgs(combined: string) {
  if (!combined)
    return [];

  const parsed = parser(combined, {
    configuration: {
      "short-option-groups": false
    }
  });
  return (
    Object.keys(parsed)
    .reduce((opts, key) => {
      if(key === "_")
        return opts;
      if (typeof parsed[key] === "boolean")
        return opts.concat([`-${key}`]);
      return opts.concat([`-${key}`, parsed[key]]);
    }, [])
  );
}
