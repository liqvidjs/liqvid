import {thumbs as renderThumbs} from "@liqvid/renderer";
import type Yargs from "yargs";
import {BROWSER_EXECUTABLE, CONCURRENCY, DEFAULT_CONFIG, parseConfig} from "./config.js";

export const thumbs = (yargs: typeof Yargs) =>
yargs.command("thumbs", "Generate thumbnails", (yargs) => {
  yargs
  .config("config", parseConfig("thumbs"))
  .default("config", DEFAULT_CONFIG)
  .example([
    ["liqvid thumbs"],
    ["liqvid thumbs -u http://localhost:8080/dist/ -o ./dist/thumbs/%s.jpeg"]
  ])
  // Selection
  .group(["output", "url"], "What to render")
  .option("output", {
    alias: "o",
    default: "./thumbs/%s.jpeg",
    desc: "Pattern for output filenames.",
    normalize: true
  })
  .option("url", {
    alias: "u",
    desc: "URL of video to generate thumbs for",
    default: "http://localhost:3000/dist/"
  })
  // General
  .group(["browser-executable", "concurrency", "config", "help"], "General options")
  .option("browser-executable", BROWSER_EXECUTABLE)
  .option("concurrency", CONCURRENCY)
  // Format
  .group(["color-scheme", "browser-height", "browser-width", "cols", "frequency", "height", "image-format", "quality", "rows", "width"], "Formatting")
  .option("color-scheme", {
    default: "light",
    choices: ["light", "dark"],
    desc: "Color scheme"
  })
  .option("cols", {
    alias: "c",
    default: 5,
    desc: "The number of columns per sheet"
  })
  .option("frequency", {
    alias: "f",
    default: 4,
    desc: "How many seconds between screenshots"
  })
  .option("rows", {
    alias: "r",
    default: 5,
    desc: "The number of rows per sheet"
  })
  .option("quality", {
    alias: "q",
    default: 80,
    desc: "Quality for images. Only applies when --image-format is \"jpeg\""
  })
  .option("height", {
    alias: "h",
    default: 100,
    desc: "Height of each thumbnail"
  })
  .option("width", {
    alias: "w",
    default: 160,
    desc: "Width of each thumbnail"
  })
  .option("browser-height", {
    alias: "H",
    desc: "Height of screenshot before resizing"
  })
  .option("browser-width", {
    alias: "W",
    desc: "Width of screenshot before resizing"
  })
  .option("image-format", {
    alias: "F",
    choices: ["jpeg", "png"],
    default: "jpeg",
    desc: "Image format for thumbnails"
  })
  .version(false);
}, async (argv: Parameters<typeof renderThumbs>[0]) => {
  await renderThumbs(argv);
  process.exit(0);
});
