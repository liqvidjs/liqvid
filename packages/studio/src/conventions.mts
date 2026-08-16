import { RelativeDir, RelativeFile } from "effect-paths";

export const DS_STORE = RelativeFile(".DS_Store");

/**
 * Prefix for the parameter marker file in `.liqvid` directories.
 * Format: `.params=lang,locale` where parameters are comma-separated.
 * This empty file indicates the project uses parameters and allows tools
 * with only filesystem access to discover the parameter structure.
 */
export const PARAMS_MARKER_PREFIX = ".params=";

export const ROOT_HIDDEN_DIR = RelativeDir(".liqvid");

export const BUILD_DIR = RelativeDir("out");

export const PREVIEW_DIR = RelativeDir("preview");

export const TRANSLATIONS_DIR = RelativeDir(".translations");

/**
 * Directory (relative to `src`) holding translations for commonly-used words
 * like "close", "cancel", etc., shared across the studio UI.
 */
export const COMMON_TRANSLATIONS_DIR = RelativeDir("src");

/**
 * `types.ts` file auto-generated inside `.liqvid` directory
 * This provides type information about the assets available
 * in the `.liqvid` directory.
 */
export const PROJECT_FILES_AUTOGEN = RelativeFile("project-files.json");

/**
 * `types.ts` file auto-generated inside `.liqvid` directory
 * This provides type information about the assets available
 * in the `.liqvid` directory.
 */
export const TYPES_AUTOGEN = RelativeFile("types.ts");

/* ------------------------------ Next.js ------------------------------ */

export const NEXT_APP_DIR = RelativeDir("app");

export const NEXT_PAGE = RelativeFile("page.tsx");

/* ------------------------------ projects ------------------------------ */

/** Project configuration file */
export const PROJECT_FILE = RelativeFile("project.json");

/** Hidden directory for Liqvid assets (renders, recordings, etc.) */
export const ASSETS_DIR = RelativeDir(".liqvid");

/** Auto-generated meta file inside `.liqvid` directory */
export const PROJECT_META_FILE = RelativeFile("project-meta.json");

/** Auto-generated meta file inside `.liqvid` directory */
export const PROJECT_PATH = RelativeFile("project-path.json");

/* ------------------------------ recording ------------------------------ */
export const RECORDINGS_DIR = RelativeDir("recordings");

export const RECORDING_META_FILE = RelativeFile("recording-meta.json");

export const RECORDING_RAW_BLOB = RelativeFile("data.bin");

export const RECORDING_RAW_FILE = RelativeFile("raw.json");

/* ------------------------------ audio ------------------------------ */
export const AUDIO_WAV = RelativeFile("audio.wav");

export const AUDIO_DIR = RelativeDir("audio");

export const CAPTIONS_FILE = RelativeFile("captions.vtt");

export const CAPTIONS_META = RelativeFile("captions-meta.json");

export const RICH_TRANSCRIPT = RelativeFile("transcript.json");

/* ------------------------------ screenshots ------------------------------ */
export const SCREENSHOTS_DIR = RelativeDir("screenshots");

export const SCREENSHOT_FILE = RelativeFile("screenshot.png");

export const SCREENSHOT_FILE_DARK = RelativeFile("dark.png");

export const SCREENSHOT_FILE_LIGHT = RelativeFile("light.png");

/* ------------------------------ thumbnails ------------------------------ */
export const THUMBS_DIR = RelativeDir("thumbs");

export const LIGHT_DIR = RelativeDir("light");

export const DARK_DIR = RelativeDir("dark");

/* ------------------------------ templates ------------------------------ */

export const TEMPLATE_FILE = RelativeFile("template.json");

/* ------------------------------ renders ------------------------------ */
export const RENDER_META_FILE = RelativeFile("render-meta.json");

export const RENDERS_DIR = RelativeDir("renders");
