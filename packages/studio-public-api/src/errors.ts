import { Schema } from "effect";

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "Unauthorized",
  {
    cause: Schema.Defect().pipe(Schema.optional),
    message: Schema.String,
  },
  { httpApiStatus: 401 },
) {}

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
  "InternalServerError",
  {
    cause: Schema.Defect().pipe(Schema.optional),
    message: Schema.String,
  },
  { httpApiStatus: 500 },
) {}

export class NotFound extends Schema.TaggedError<NotFound>()(
  "NotFound",
  {
    cause: Schema.Defect().pipe(Schema.optional),
    message: Schema.String,
  },
  { httpApiStatus: 404 },
) {}
