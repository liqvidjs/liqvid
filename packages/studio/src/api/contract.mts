import {
  ColorScheme,
  ColorSchemeOption,
  ImageFormat,
  Locale,
  RecordingMeta,
  ScreenshotEntry,
} from "@liqvid/schemas";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/unstable/httpapi";
import { SchemaRelativeDir } from "effect-paths";

import {
  ConflictError,
  InvalidError,
  NotFoundError,
} from "../utils/errors.mts";

import { AudioEntry, RenderEntry, ThumbsData } from "./schemas.mts";

const projectPathQuery = Schema.Struct({
  /** path to the project */
  projectPath: SchemaRelativeDir,
});

/** Query parameters for endpoints that support parameterized projects */
const projectPathWithParamsQuery = Schema.Struct({
  /**
   * JSON-encoded parameter values for parameterized projects.
   * e.g., `{"lang":"en","locale":"US"}`
   */
  params: Schema.String.pipe(Schema.optional),

  /** path to the project */
  projectPath: SchemaRelativeDir,
});

/* ------------------------------ audio ------------------------------ */
const audioGroup = HttpApiGroup.make("audio")
  .add(
    HttpApiEndpoint.get("list", "/audio", {
      query: projectPathWithParamsQuery,
      success: Schema.Struct({
        items: Schema.Array(AudioEntry),
        /** Whether the project is configured for multiple audio renderings */
        multiple: Schema.Boolean,
      }),
    }).annotate(OpenApi.Summary, "List audio renderings for a project"),
  )
  .add(
    HttpApiEndpoint.post("generate", "/audio/generate", {
      payload: Schema.Null,
      query: projectPathWithParamsQuery,
      success: Schema.Struct({
        /** Id (folder name, or "default" in single-audio mode) */
        id: Schema.String,
      }),
    }).annotate(OpenApi.Summary, "Render a new audio track for a project"),
  )
  .add(
    HttpApiEndpoint.post("rename", "/audio/rename", {
      error: [InvalidError, NotFoundError, ConflictError],
      payload: Schema.Struct({
        /** Current audio id (folder name) */
        id: Schema.String,
        /** New name for the audio rendering */
        newName: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({
        /** New audio id (folder name) */
        newId: Schema.String,
      }),
    }).annotate(OpenApi.Summary, "Rename an audio rendering"),
  )
  .add(
    HttpApiEndpoint.delete("delete", "/audio/delete", {
      error: NotFoundError,
      payload: Schema.Struct({
        /** Audio id (folder name) to delete */
        id: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(
      OpenApi.Summary,
      "Delete an audio rendering (and its captions)",
    ),
  )
  .annotate(OpenApi.Title, "Audio");

/* ------------------------------ captions ------------------------------ */
const captionsGroup = HttpApiGroup.make("captions")
  .add(
    HttpApiEndpoint.post("generate", "/captions/generate", {
      error: [InvalidError, NotFoundError],
      payload: Schema.Struct({
        /** Audio id (folder name, or "default") to caption */
        audioId: Schema.String,
        /** Whisper model to use */
        modelName: Schema.optional(Schema.String),
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({
        /** Status of the generation */
        status: Schema.Literals(["started", "already_generating"]),
      }),
    }).annotate(OpenApi.Summary, "Generate captions for an audio rendering"),
  )
  .add(
    HttpApiEndpoint.delete("delete", "/captions/delete", {
      error: NotFoundError,
      payload: Schema.Struct({
        /** Audio id (folder name, or "default") whose captions to delete */
        audioId: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Delete captions for an audio rendering"),
  )
  .annotate(OpenApi.Title, "Captions");

/* ------------------------------ projects ------------------------------ */
const projectsGroup = HttpApiGroup.make("projects")
  .add(
    HttpApiEndpoint.post("setProjectMeta", "/project-meta", {
      payload: Schema.Struct({
        durationMs: Schema.Number,
      }),
      query: projectPathWithParamsQuery,
    }).annotate(OpenApi.Summary, "Set project metadata"),
  )
  .annotate(OpenApi.Title, "Projects");

/* ------------------------------ renders ------------------------------ */
const rendersGroup = HttpApiGroup.make("renders")
  .add(
    HttpApiEndpoint.get("list", "/renders", {
      query: projectPathWithParamsQuery,
      success: Schema.Array(RenderEntry),
    }).annotate(OpenApi.Summary, "List renders for a project"),
  )
  .add(
    HttpApiEndpoint.post("start", "/renders/start", {
      payload: Schema.Struct({
        /** Color scheme: light or dark */
        colorScheme: Schema.optional(ColorScheme),

        /** Frames per second */
        fps: Schema.optional(Schema.Number),

        /** Video height */
        height: Schema.optional(Schema.Number),

        /**
         * Parameter values for parameterized projects.
         * e.g., `{ lang: "en", locale: "US" }`
         */
        params: Schema.optional(Schema.Record(Schema.String, Schema.String)),

        /** Video width */
        width: Schema.optional(Schema.Number),
      }),
      query: Schema.Struct({
        projectPath: SchemaRelativeDir,
      }),
      success: Schema.Struct({
        /** Render ID (datetime folder name) */
        id: Schema.String,
      }),
    }),
  )
  .add(
    HttpApiEndpoint.post("rename", "/renders/rename", {
      error: [InvalidError, NotFoundError, ConflictError],
      payload: Schema.Struct({
        /** New name for the render */
        newName: Schema.String,
        /** Current render ID */
        renderId: Schema.String,
      }),

      query: projectPathWithParamsQuery,

      success: Schema.Struct({
        /** New render ID (folder name) */
        newId: Schema.String,
      }),
    }).annotate(OpenApi.Summary, "Rename a render"),
  )
  .add(
    HttpApiEndpoint.delete("delete", "/renders/delete", {
      error: NotFoundError,
      payload: Schema.Struct({
        /** Render folder id to delete */
        renderId: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Delete a render"),
  )
  .annotate(OpenApi.Description, "Static renders of a project")
  .annotate(OpenApi.Summary, "Renders for a project")
  .annotate(OpenApi.Title, "Static renders");

/* ------------------------------ recordings ------------------------------ */

const recordingsGroup = HttpApiGroup.make("recordings")
  .add(
    HttpApiEndpoint.get("list", "/recordings", {
      query: projectPathWithParamsQuery,
      success: Schema.Array(RecordingMeta),
    }),
  )
  .add(
    HttpApiEndpoint.post("save", "/recordings", {
      // Multipart payload: metadata JSON + plugin data (blobs or JSON strings)
      // We use handleRaw in the implementation since plugin keys are dynamic
      payload: Schema.Struct({
        metadata: Schema.String,
      }).pipe(HttpApiSchema.asMultipart()),
      query: Schema.Struct({
        /** path to the project */
        projectPath: SchemaRelativeDir,
      }),
      success: HttpApiSchema.Created,
    }).annotate(OpenApi.Summary, "Save a new recording"),
  )
  .add(
    HttpApiEndpoint.post("reprocess", "/recordings/reprocess", {
      payload: Schema.Struct({
        /** Recording name (ISO timestamp format, e.g., "2024-01-15T12-30-00-000Z") */
        recordingName: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(
      OpenApi.Summary,
      "Re-run post-processing plugins for a recording",
    ),
  );

/* ------------------------------ screenshots ------------------------------ */
const targetFilename = Schema.Literals([
  "opengraph-image.png",
  "twitter-image.png",
]);

const screenshotsGroup = HttpApiGroup.make("screenshots")
  .add(
    HttpApiEndpoint.get("list", "/screenshots", {
      query: projectPathWithParamsQuery,
      success: Schema.Array(ScreenshotEntry),
    }).annotate(OpenApi.Summary, "List screenshots for a project"),
  )
  .add(
    HttpApiEndpoint.post("capture", "/screenshots/capture", {
      payload: Schema.Struct({
        /** Color scheme: light, dark, or both */
        colorScheme: Schema.optional(ColorSchemeOption),
        /** Height of screenshot */
        height: Schema.Number,
        /**
         * Parameter values for parameterized projects.
         * e.g., `{ lang: "en", locale: "US" }`
         */
        params: Schema.optional(Schema.Record(Schema.String, Schema.String)),
        /** Time in seconds to capture */
        time: Schema.Number,
        /** Width of screenshot */
        width: Schema.Number,
      }),
      query: projectPathQuery,
      success: ScreenshotEntry,
    }).annotate(OpenApi.Summary, "Capture a screenshot"),
  )
  .add(
    HttpApiEndpoint.post("copy", "/screenshots/copy", {
      payload: Schema.Struct({
        /** Screenshot folder id */
        screenshotId: Schema.String,

        /** Source filename for "both" mode (light.png or dark.png) */
        sourceFilename: Schema.optional(
          Schema.Literals(["light.png", "dark.png"]),
        ),

        /** Target filename (opengraph-image.png or twitter-image.png) */
        targetFilename,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Copy a screenshot to the project root"),
  )
  .add(
    HttpApiEndpoint.post("rename", "/screenshots/rename", {
      error: [InvalidError, NotFoundError, ConflictError],
      payload: Schema.Struct({
        /** New name for the screenshot */
        newName: Schema.String,
        /** Current screenshot folder id */
        screenshotId: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({
        /** New screenshot id (folder name) */
        newId: Schema.String,
      }),
    }).annotate(OpenApi.Summary, "Rename a screenshot"),
  )
  .add(
    HttpApiEndpoint.delete("delete", "/screenshots/delete", {
      error: NotFoundError,
      payload: Schema.Struct({
        /** Screenshot folder id to delete */
        screenshotId: Schema.String,
      }),
      query: projectPathWithParamsQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Delete a screenshot"),
  )
  .add(
    HttpApiEndpoint.get("checkExists", "/screenshots/check-exists", {
      query: Schema.Struct({
        filename: targetFilename,
        projectPath: SchemaRelativeDir,
      }),
      success: Schema.Struct({ exists: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Check whether a project image exists"),
  );

/* ------------------------------ settings ------------------------------ */

/** Provider that can host content files (html/css/js). */
const ContentBackend = Schema.Literals([
  "copy",
  "githubPages",
  "liqvidStudio",
  "s3",
  "sftp",
]);

/** Provider that can host media files (audio, video, thumbnails). */
const MediaBackend = Schema.Literals(["copy", "liqvidStudio", "s3", "sftp"]);

/** Backend hosting configuration. */
const BackendConfig = Schema.Struct({
  content: Schema.optional(ContentBackend),
  media: Schema.optional(MediaBackend),
});

/** Media configuration surfaced in the settings UI. */
const MediaSettings = Schema.Struct({
  audio: Schema.optional(
    Schema.Struct({
      /** Whether to keep multiple audio renderings. */
      multiple: Schema.optional(Schema.Boolean),
    }),
  ),
});

/** Destination for the copy provider. */
const CopyDestinationSetting = Schema.Union([
  Schema.String,
  Schema.Struct({
    hosting: Schema.String,
    media: Schema.String,
  }),
]);

/** Copy provider settings. */
const CopyProviderSettings = Schema.Struct({
  clean: Schema.optional(Schema.Boolean),
  destination: CopyDestinationSetting,
});

/** GitHub Pages provider settings. */
const GitHubPagesProviderSettings = Schema.Struct({
  repository: Schema.String,
  root: Schema.optional(Schema.Boolean),
  username: Schema.String,
});

/** Liqvid Studio hosting provider settings. */
const LiqvidStudioProviderSettings = Schema.Struct({
  username: Schema.String,
});

/**
 * S3 provider settings. Secret credentials are intentionally omitted; those
 * should be supplied via environment variables in `liqvid.json`.
 */
const S3ProviderSettings = Schema.Struct({
  bucket: Schema.String,
  domain: Schema.String,
  prefix: Schema.optional(Schema.String),
  region: Schema.optional(Schema.String),
});

/** SFTP provider settings. */
const SftpProviderSettings = Schema.Struct({
  host: Schema.String,
  path: Schema.String,
});

/** Editable subset of `liqvid.json` provider configuration. */
const ProvidersConfig = Schema.Struct({
  copy: Schema.optional(CopyProviderSettings),
  githubPages: Schema.optional(GitHubPagesProviderSettings),
  liqvidStudio: Schema.optional(LiqvidStudioProviderSettings),
  s3: Schema.optional(S3ProviderSettings),
  sftp: Schema.optional(SftpProviderSettings),
});

/** Editable subset of `liqvid.json` surfaced in the settings UI. */
export const SettingsConfig = Schema.Struct({
  backend: Schema.optional(BackendConfig),
  basePath: Schema.optional(Schema.String),
  media: Schema.optional(MediaSettings),
  providers: Schema.optional(ProvidersConfig),
});

export type SettingsConfig = (typeof SettingsConfig)["Type"];

const settingsGroup = HttpApiGroup.make("settings")
  .add(
    HttpApiEndpoint.get("getLocale", "/settings/locale", {
      success: Schema.Struct({
        /** Current UI locale */
        locale: Locale,
      }),
    }).annotate(OpenApi.Summary, "Get the current UI locale"),
  )
  .add(
    HttpApiEndpoint.post("setLocale", "/settings/locale", {
      payload: Schema.Struct({
        /** Locale to set for the Liqvid Studio UI */
        locale: Locale,
      }),
      success: Schema.Struct({
        /** The locale that was set */
        locale: Locale,
      }),
    }).annotate(OpenApi.Summary, "Update the UI locale in liqvid.json"),
  )
  .add(
    HttpApiEndpoint.get("getConfig", "/settings/config", {
      success: SettingsConfig,
    }).annotate(
      OpenApi.Summary,
      "Get editable liqvid.json settings (backend, basePath, media, providers)",
    ),
  )
  .add(
    HttpApiEndpoint.post("setConfig", "/settings/config", {
      payload: SettingsConfig,
      success: SettingsConfig,
    }).annotate(
      OpenApi.Summary,
      "Update editable liqvid.json settings (backend, basePath, media, providers)",
    ),
  )
  .annotate(OpenApi.Title, "Settings");

/* ------------------------------ thumbnails ------------------------------ */
const thumbsGroup = HttpApiGroup.make("thumbs").add(
  HttpApiEndpoint.get("list", "/thumbs", {
    error: [NotFoundError],
    query: projectPathWithParamsQuery,
    success: ThumbsData,
  }),

  HttpApiEndpoint.post("generate", "/thumbs/generate", {
    payload: Schema.optional(
      Schema.Struct({
        /** Color scheme: light, dark, or both */
        colorScheme: Schema.optional(ColorSchemeOption),

        /** Number of columns per sheet */
        cols: Schema.optional(Schema.Number),

        /** Seconds between screenshots */
        frequency: Schema.optional(Schema.Number),

        /** Height of each thumbnail */
        height: Schema.optional(Schema.Number),

        /** Image format: jpeg or png */
        imageFormat: Schema.optional(ImageFormat),

        /**
         * Parameter values for parameterized projects.
         * e.g., `{ lang: "en", locale: "US" }`
         */
        params: Schema.optional(Schema.Record(Schema.String, Schema.String)),

        /** Quality for JPEG images (0-100) */
        quality: Schema.optional(Schema.Number),

        /** Number of rows per sheet */
        rows: Schema.optional(Schema.Number),

        /** Width of each thumbnail */
        width: Schema.optional(Schema.Number),
      }),
    ),

    query: projectPathQuery,

    success: Schema.Struct({
      /** Thumbnail sheets for dark mode (if colorScheme is "dark" or "both") */
      dark: Schema.optional(Schema.Array(Schema.String)),

      /** Thumbnail sheets for light mode (if colorScheme is "light" or "both") */
      light: Schema.optional(Schema.Array(Schema.String)),

      /** Number of thumbnail sheets generated per color scheme */
      numSheets: Schema.Number,
    }),
  }),
);

/** Liqvid Studio web API */
export const WebApi = HttpApi.make("LiqvidStudioWebApi")
  .add(
    audioGroup,
    captionsGroup,
    projectsGroup,
    recordingsGroup,
    rendersGroup,
    screenshotsGroup,
    settingsGroup,
    thumbsGroup,
  )
  .prefix("/api/liqvid")
  .annotate(OpenApi.Title, "Liqvid Web API")
  .annotate(OpenApi.Version, "1.0.0");

export type WebApi = typeof WebApi;
