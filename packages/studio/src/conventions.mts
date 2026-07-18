import { RelativeDir, RelativeFile } from "effect-paths";

export const NEXT_APP_DIR = RelativeDir("app");

export const ROOT_HIDDEN_DIR = RelativeDir(".liqvid");

export const BUILD_DIR = RelativeDir("out");

export const PREVIEW_DIR = RelativeDir("preview");

export const TRANSLATIONS_DIR = RelativeDir(".translations");

/* ------------------------------ projects ------------------------------ */

/** Project configuration file */
export const PROJECT_FILE = RelativeFile("project.json");

/** Hidden directory for Liqvid assets (renders, recordings, etc.) */
export const ASSETS_DIR = RelativeDir(".liqvid");

/** Auto-generated meta file inside `.liqvid` directory */
export const PROJECT_META_FILE = RelativeFile("project-meta.json");

/* ------------------------------ recording ------------------------------ */
export const RECORDING_META_FILE = RelativeFile("recording-meta.json");

/* ------------------------------ audio ------------------------------ */
export const AUDIO_WAV = RelativeFile("audio.wav");

export const AUDIO_DIR = RelativeDir("audio");

export const CAPTIONS_FILE = RelativeFile("captions.vtt");

export const CAPTIONS_META = RelativeFile("captions-meta.json");

export const RICH_TRANSCRIPT = RelativeFile("transcript.json");

/* ------------------------------ screenshots ------------------------------ */
export const SCREENSHOTS_DIR = RelativeDir("screenshots");

export const SCREENSHOT_FILE = RelativeFile("screenshot.png");

/* ------------------------------ thumbnails ------------------------------ */
export const THUMBS_DIR = RelativeDir("thumbs");

export const LIGHT_DIR = RelativeDir("light");

export const DARK_DIR = RelativeDir("dark");

/* ------------------------------ templates ------------------------------ */

export const TEMPLATE_FILE = RelativeFile("template.json");

/* ------------------------------ renders ------------------------------ */
export const RENDER_META_FILE = RelativeFile("render-meta.json");

export const RENDERS_DIR = RelativeDir("renders");
