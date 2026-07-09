import { ScreenshotEntry } from "@liqvid/schemas/effect";
import { Schema } from "effect";
import {
  HttpApi,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/unstable/httpapi";

/** Liqvid Studio web API */
export const WebApi = HttpApi.make("LiqvidStudioWebApi")
  .add(
    HttpApiGroup.make("screenshots").add(
      HttpApiEndpoint.get("list", "/screenshots", {
        /** `projectPath` is passed as a URL search param (`?projectPath=...`). */
        query: Schema.Struct({
          /** path to the project */
          projectPath: Schema.String,
        }),
        success: Schema.Array(ScreenshotEntry),
      }),
    ),
  )
  .prefix("/api/liqvid");

export type WebApi = typeof WebApi;
