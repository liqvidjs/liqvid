import {
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

import { CaptionsMeta } from "../types/schemas.mts";
import {
  ConflictError,
  InvalidError,
  NotFoundError,
} from "../utils/errors.mts";

import { ThumbsData } from "./schemas.mts";

const projectPathQuery = Schema.Struct({
  /** path to the project */
  projectPath: Schema.String,
});

const urlQuery = Schema.Struct({
  /** path to the project */
  url: Schema.String,
});

/* ------------------------------ captions ------------------------------ */
const captionsGroup = HttpApiGroup.make("captions").add(
  HttpApiEndpoint.get("list", "/captions", {
    error: NotFoundError,
    query: projectPathQuery,
    success: CaptionsMeta,
  }).annotate(OpenApi.Summary, "List captions for a project"),
);

/* ------------------------------ projects ------------------------------ */
const projectsGroup = HttpApiGroup.make("projects").add(
  HttpApiEndpoint.post("setProjectMeta", "/project-meta", {
    payload: Schema.Struct({
      durationMs: Schema.Number,
    }),
    query: urlQuery,
  }).annotate(OpenApi.Summary, "Set project metadata"),
);

/* ------------------------------ renders ------------------------------ */

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

    query: Schema.Struct({
      projectPath: Schema.String,
    }),

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
    captionsGroup,
    projectsGroup,
    recordingsGroup,
    screenshotsGroup,
    thumbsGroup,
  )
  .prefix("/api/liqvid")
  .annotate(OpenApi.Title, "Liqvid Studio Web API")
  .annotate(OpenApi.Version, "1.0.0");

export type WebApi = typeof WebApi;
