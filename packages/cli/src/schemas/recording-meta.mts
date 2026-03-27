import { z } from "zod";

export const RecordingMetaFile = z.object({
  created: z.iso.datetime(),
  duration: z.object({
    milliseconds: z.number(),
  }),
});
export type RecordingMetaFile = z.infer<typeof RecordingMetaFile>;

export const RecordingMeta = RecordingMetaFile.extend({
  name: z.string(),
  plugins: z.array(z.string()),
});
export type RecordingMeta = z.infer<typeof RecordingMeta>;
