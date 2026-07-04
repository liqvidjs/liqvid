import { Data } from "effect";

// Define a custom error type using Data.TaggedError
export class HttpError extends Data.TaggedError("HttpError")<{
  message: string;
  status: number;
}> {}
