import { Data, type Schema } from "effect";

// Define a custom error type using Data.TaggedError
export class HttpError extends Data.TaggedError("HttpError")<{
  message: string;
  status: number;
}> {}

export class FileDecodeError extends Data.TaggedError("FileDecodeError")<{
  filename: string;
  cause: Schema.SchemaError;
}> {}
