import { RelativeDir, RelativeFile } from "effect-paths";

/** Main configuration file */
export const CONFIG_FILE = RelativeFile("liqvid.json");

/** Default glob patterns for media files (matches schema defaults) */
export const DEFAULT_MEDIA_PATTERNS = [
  // standard media files
  "**/*.gif",
  "**/*.jpeg",
  "**/*.jpg",
  "**/*.m3u8",
  "**/*.mov",
  "**/*.mp4",
  "**/*.png",
  "**/*.webm",
  "**/*.vtt",

  // omit params file
  "!**/.params=*",

  // omit social share images handled by Next
  "!**/opengraph-image.*",
  "!**/twitter-image.*",

  // OS X
  "!**/.DS_Store",

  // exclude preview dir
  "!**/.liqvid/preview",

  // assets dir
  "**/.liqvid/**/*",
  "!**/.liqvid/project-files.json",
  "!**/.liqvid/project-path.json",
  "!**/.liqvid/**/project-meta.json",

  // distinguish Transport Stream files from TypeScript files
  "**/.liqvid/**/*.ts",
  "!**/.liqvid/types.ts",
  "!**/*.d.ts",
  "!**/*.d.json.ts",

  // audio
  "!**/.liqvid/**/audio/audio.wav",
  "!**/.liqvid/**/audio/audio-meta.json",
  "!**/.liqvid/**/audio/captions-meta.json",
  "!**/.liqvid/**/audio/transcript-raw.json",

  // codemirror
  "!**/.liqvid/**/@lqv+codemirror/raw.json",

  // media recording
  "!**/.liqvid/**/@liqvid+media/video.webm",

  // renders
  "!**/.liqvid/**/renders",
  "!**/.liqvid/**/recordings/recording-meta.json",
  "!**/.liqvid/**/screenshots",
  "!**/.liqvid/**/thumbs/thumbnails-job.json",
];

/** Default base directory for media files */
export const DEFAULT_MEDIA_BASE_DIR = RelativeDir("app");
