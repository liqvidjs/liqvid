import { ThumbnailsJob } from "@liqvid/schemas/effect";
import { Schema } from "effect";

export const ThumbsData = Schema.Struct({
  /** Thumbnail sheets for dark mode */
  dark: Schema.Array(Schema.String),

  /** Thumbnail job configuration (null if no thumbs exist) */
  job: Schema.NullOr(ThumbnailsJob),

  /** Thumbnail sheets for light mode */
  light: Schema.Array(Schema.String),
});

export type ThumbsData = (typeof ThumbsData)["Type"];
