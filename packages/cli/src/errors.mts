import { Data, type Schema } from "effect";

export class FileDecodeError extends Data.TaggedError("FileDecodeError")<{
  filename: string;
  cause: Schema.SchemaError;
}> {}
