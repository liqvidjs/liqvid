import {
  ColorScheme,
  ColorSchemeOption,
  ImageFormat,
  RecordingMeta,
  ScreenshotEntry,
} from "@liqvid/schemas/effect";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";

import {
  ConflictError,
  InvalidError,
  NotFoundError,
} from "../utils/errors.mts";

import { AudioEntry, RenderEntry, ThumbsData } from "./schemas.mts";

const projectPathQuery = Schema.Struct({
  /** path to the project */
  projectPath: Schema.String,
});

const urlQuery = Schema.Struct({
  /** path to the project */
  url: Schema.String,
});

/* ------------------------------ audio ------------------------------ */
const audioGroup = HttpApiGroup.make("audio")
  .add(
    HttpApiEndpoint.get("list", "/audio", {
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: urlQuery,
    }).annotate(OpenApi.Summary, "Set project metadata"),
  )
  .annotate(OpenApi.Title, "Projects");

/* ------------------------------ renders ------------------------------ */
const rendersGroup = HttpApiGroup.make("renders")
  .add(
    HttpApiEndpoint.get("list", "/renders", {
      query: projectPathQuery,
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

        /** Video width */
        width: Schema.optional(Schema.Number),
      }),
      query: Schema.Struct({
        projectPath: Schema.String,
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

      query: projectPathQuery,

      success: Schema.Struct({
        /** New render ID (folder name) */
        newId: Schema.String,
      }),
    }).annotate(OpenApi.Summary, "Rename a render"),
  )
  .annotate(OpenApi.Description, "Static renders of a project")
  .annotate(OpenApi.Summary, "Renders for a project")
  .annotate(OpenApi.Title, "Static renders");

/* ------------------------------ recordings ------------------------------ */
const recordingsGroup = HttpApiGroup.make("recordings").add(
  HttpApiEndpoint.get("list", "/recordings", {
    query: {
      url: Schema.String,
    },
    success: Schema.Array(RecordingMeta),
  }),
);

/* ------------------------------ screenshots ------------------------------ */
const targetFilename = Schema.Literals([
  "opengraph-image.png",
  "twitter-image.png",
]);

const screenshotsGroup = HttpApiGroup.make("screenshots")
  .add(
    HttpApiEndpoint.get("list", "/screenshots", {
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: projectPathQuery,
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
      query: projectPathQuery,
      success: Schema.Struct({ success: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Delete a screenshot"),
  )
  .add(
    HttpApiEndpoint.get("checkExists", "/screenshots/check-exists", {
      query: Schema.Struct({
        filename: targetFilename,
        projectPath: Schema.String,
      }),
      success: Schema.Struct({ exists: Schema.Boolean }),
    }).annotate(OpenApi.Summary, "Check whether a project image exists"),
  );

/* ------------------------------ thumbnails ------------------------------ */
const thumbsGroup = HttpApiGroup.make("thumbs").add(
  HttpApiEndpoint.get("list", "/thumbs", {
    error: [NotFoundError],
    query: projectPathQuery,
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
    thumbsGroup,
  )
  .prefix("/api/liqvid")
  .annotate(OpenApi.Title, "Liqvid Studio Web API")
  .annotate(OpenApi.Version, "1.0.0");

export type WebApi = typeof WebApi;
