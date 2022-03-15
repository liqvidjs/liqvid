import execa from "execa";
import {promises as fsp} from "fs";
import os from "os";
import path from "path";

/**
 * Join multiple audio files into one.
 */
 export async function join({
   filenames,
   output
 }: {
  /** Files to join. */
  filenames: string[];

  /** Destination file. If not specified, defaults to last file in filenames. */
  output?: string;
}) {
  if (filenames.length === 0) {
    console.error("Must provide at least one input file");
    process.exit();
  }

  if (!output) {
    if (filenames.length === 1) {
      console.error("Must provide at least one input file");
      process.exit();
    }
    output = filenames.pop();
  }

  // create join list
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "liqvid.audio.join"));
  const myList = path.join(tempDir, "mylist.txt");
  await fsp.writeFile(myList, filenames.map(name => `file '${name}'`).join("\n"));

  // ffmpeg command
  const ext = path.extname(output);

  const opts = [
    "-f", "concat",
    "-safe", "0",
    "-i", myList,
    "-c", "copy",
    // special args for webm
    ...(ext === ".webm" ? ["-strict", "-2"] : []),
    output
  ];
  
  const job = execa("ffmpeg", opts);
  await job;

  // clean up
  await fsp.rm(tempDir, {recursive: true});
}
