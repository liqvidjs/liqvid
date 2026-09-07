import { Schema } from "effect";

export class FileDecodeError extends Schema.TaggedError<FileDecodeError>()(
  "FileDecodeError",
  {
    cause: Schema.instanceOf(Schema.SchemaError),
    filename: Schema.String,
  },
) {
  override get message() {
    return `Invalid file structure in ${this.filename}:\n${this.cause.message}`;
  }
}
