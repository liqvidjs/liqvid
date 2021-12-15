import {promises as fsp} from "fs";
import fs from "fs";
import type Yargs from "yargs";
import path from "path";

import {parseConfig, DEFAULT_CONFIG} from "./config.js";
// import {formatTime, formatTimeMs} from "@liqvid/utils/time";

/**
 * Export captions as WebVTT
*/ 
export const webvtt = (yargs: typeof Yargs) =>
  yargs
  .command("webvtt <infile> <outfile>", "Convert captions to webvtt format", (yargs) => {
    return (yargs
      .option("infile", {
        "normalize": true
      })
      .option("outfile", {
        desc: "where it goes"
      })
    );
  }, async ({infile, outfile}: {
    infile: string;
    outfile: string;
  }) => {
    const transcript = JSON.parse(await fsp.readFile(path.join(process.cwd(), infile), "utf8"));

    const captions = ["WEBVTT", ""];

    for (let i = 0; i < transcript.length; ++i) {
      const line = transcript[i];
      if (line.length === 0)
        continue;
      captions.push(String(i+1));
      captions.push(formatTimeMs(line[0][1]) + " --> " + formatTimeMs(line[line.length - 1][2]));
      captions.push(line.map(_ => _[0]).join(" "));
      captions.push("");
    }
    
    await fsp.writeFile(outfile, captions.join("\n"));
  });
 

function formatTime(time: number): string {
  if (time < 0) {
    return "-" + formatTime(-time);
  }
  const minutes = Math.floor(time / 60 / 1000),
        seconds = Math.floor(time / 1000 % 60);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimeMs(time: number): string {
  if (time < 0) {
    return "-" + formatTimeMs(-time);
  }
  const milliseconds = Math.floor(time % 1000);

  return `${formatTime(time)}.${milliseconds.toString().padStart(3, "0")}`;
}
