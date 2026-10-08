import { Schema } from "effect";
import { StatusCodes } from "http-status-codes";

export class ConflictError extends Schema.TaggedError<ConflictError>()(
  "Conflict",
  {
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.CONFLICT },
) {}

export class InvalidError extends Schema.TaggedError<InvalidError>()(
  "Invalid",
  {
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.BAD_REQUEST },
) {}

export class NotFoundError extends Schema.TaggedError<NotFoundError>()(
  "NotFound",
  {
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.NOT_FOUND },
) {}

export class InvalidProjectStructure extends Schema.TaggedError<InvalidProjectStructure>()(
  "InvalidProjectStructure",
  {
    cause: Schema.Defect().pipe(Schema.optional),
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.INTERNAL_SERVER_ERROR },
) {}
