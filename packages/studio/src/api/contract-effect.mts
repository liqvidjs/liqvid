import {
  RecordingMeta,
  ScreenshotEntry,
  ThumbnailsJob,
} from "@liqvid/schemas/effect";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
  OpenApi,
} from "effect/unstable/httpapi";

import { CaptionsMeta } from "../types/schemas.mts";
import { NotFoundError } from "../utils/errors.mts";

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
const screenshotsGroup = HttpApiGroup.make("screenshots").add(
  HttpApiEndpoint.get("list", "/screenshots", {
    query: projectPathQuery,
    success: Schema.Array(ScreenshotEntry),
  }),
);

/* ------------------------------ thumbnails ------------------------------ */
const thumbsGroup = HttpApiGroup.make("thumbs").add(
  HttpApiEndpoint.get("list", "/thumbs", {
    query: projectPathQuery,
    success: Schema.Struct({
      /** Thumbnail sheets for dark mode */
      dark: Schema.Array(Schema.String),

      /** Thumbnail job configuration (null if no thumbs exist) */
      job: Schema.NullOr(ThumbnailsJob),

      /** Thumbnail sheets for light mode */
      light: Schema.Array(Schema.String),
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
