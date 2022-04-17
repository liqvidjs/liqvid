import path from "path";
import type Yargs from "yargs";
import {DEFAULT_CONFIG, parseConfig} from "./config.mjs";

/**
 * Audio utilities
*/
export const audio = (yargs: typeof Yargs) => yargs.command(
  "audio",
  "Audio helpers",
  (yargs) => {
    return (yargs
      // convert command
      .command(
        "convert <filename>",
        "Repair and convert webm recordings",
        yargs => yargs
        .positional("filename", {
          describe: "WebM File to convert",
          type: "string"
        }),
        async (opts) => {
          const {convert} = await import("@liqvid/renderer");
          await convert(opts);
        }
      )
      // join command
      .command(
        "join [filenames..]",
        "Join audio files into a single file",
        yargs => yargs
          .positional("filenames", {
            desc: "Filenames to join",
            coerce: (filenames: string[]) => filenames ? filenames.map(_ => path.resolve(_)) : []
          })
          .option("output", {
            alias: "o",
            desc: "Output file. If not specified, defaults to last input filename.",
            coerce: (output?: string) => output ? path.resolve(output) : output
          }),
        async (opts) => {
          const {join} = await import("@liqvid/renderer");
          await join(opts);
        })
      // transcribe command
      .command(
        "transcribe",
        "Transcribe audio",
        yargs => yargs
          .config("config", parseConfig("audio", "transcribe"))
          .default("config", DEFAULT_CONFIG)
          .option("api-key", {
            desc: "IBM API key",
            demandOption: true,
            type: "string"
          })
          .option("api-url", {
            desc: "IBM Watson endpoint URL",
            demandOption: true,
            type: "string"
          })
          .option("input", {
            alias: "i",
            desc: "Audio filename",
            normalize: true,
            demandOption: true
          })
          .option("captions", {
            alias: "c",
            default: "./captions.vtt",
            desc: "Captions input filename",
            normalize: true
          })
          .option("transcript", {
            alias: "t",
            default: "./transcript.json",
            desc: "Rich transcript filename",
            normalize: true
          })
          .option("params", {
            desc: "Parameters for IBM Watson",
            default: {}
          }),
        async (opts) => {
          const {transcribe} = await import("@liqvid/captioning");
          await transcribe(opts);
        })
      .demandCommand(1, "Must specify an audio command")
    );
  }
);
