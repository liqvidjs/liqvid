import { Schema } from "effect";
import { StatusCodes } from "http-status-codes";

export class ConflictError extends Schema.TaggedErrorClass<ConflictError>()(
  "Conflict",
  {
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.CONFLICT },
) {}

export class InvalidError extends Schema.TaggedErrorClass<InvalidError>()(
  "Invalid",
  {
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.BAD_REQUEST },
) {}

export class NotFoundError extends Schema.TaggedErrorClass<NotFoundError>()(
  "NotFound",
  {
    message: Schema.String,
  },
  { httpApiStatus: StatusCodes.NOT_FOUND },
) {}
