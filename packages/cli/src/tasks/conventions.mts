export const CONFIG_FILE = "liqvid.json";

/** Default glob patterns for media files (matches schema defaults) */
export const DEFAULT_MEDIA_PATTERNS = [
  "**/*.gif",
  "**/*.jpeg",
  "**/*.jpg",
  "**/*.m3u8",
  "**/*.mov",
  "**/*.mp4",
  "**/*.png",
  "**/*.webm",
  "**/.liqvid/**/*",
  "!**/.liqvid/preview",
  "!**/.liqvid/**/@lqv@codemirror/raw.json",
  "!**/.liqvid/**/@liqvid@media/video.webm",
  "!**/.DS_Store",
  // distinguish Transport Stream files from TypeScript files
  "**/.liqvid/**/*.ts",
  "!**/.liqvid/types.ts",
  "!**/*.d.ts",
  "!**/*.d.json.ts",
];

/** Default base directory for media files */
export const DEFAULT_MEDIA_BASE_DIR = "app";
