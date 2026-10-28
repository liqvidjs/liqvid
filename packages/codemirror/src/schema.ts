import { Schema } from "effect";

import { scrollCmd } from "./index.ts";
import type { CMState } from "./types.ts";
import { PACKAGE } from "./version.ts";

type EditorChangeData = readonly [
  readonly [number, ...(EditorChangeData | number | string)[]],
  readonly [number, number],
];

const EditorChange: Schema.Codec<EditorChangeData> = Schema.suspend(() =>
  Schema.Tuple([
    Schema.TupleWithRest(Schema.Tuple([Schema.Number]), [
      Schema.Union([EditorChange, Schema.Number, Schema.String]),
    ]),
    Schema.Tuple([Schema.Number, Schema.Number]),
  ]),
);

const ScrollAction = Schema.Union([
  Schema.Tuple([Schema.Literals([scrollCmd]), Schema.Number]),
  Schema.Tuple([Schema.Literals([scrollCmd]), Schema.Number, Schema.Number]),
]);

const CaptureData = Schema.Union([EditorChange, ScrollAction, Schema.String]);

const CMRange = Schema.Struct({
  anchor: Schema.Number,
  head: Schema.Number,
});

const CMStateSchema: Schema.Codec<CMState> = Schema.Struct({
  activeFile: Schema.String,
  files: Schema.Record(
    Schema.String,
    Schema.Struct({
      content: Schema.optional(Schema.String),
      selection: Schema.optional(CMRange),
    }),
  ),
});

/** Effect schema for recordings produced by the CodeMirror plugin. */
export const CodeMirrorRecording = Schema.Struct({
  $schema: Schema.optional(Schema.String),
  initial: CMStateSchema,
  package: Schema.Literals([PACKAGE]),
  replay: Schema.Array(Schema.Tuple([Schema.Number, CaptureData])),
  version: Schema.String,
});
