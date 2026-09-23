import { Schema } from "effect";

export const Keys = (max: number, message: string) =>
  Schema.Array(Key).check(
    Schema.isMinLength(1, { message: "At least one key is required" }),
    Schema.isMaxLength(max, { message }),
  );

export const Key = Schema.String.check(
  Schema.isMinLength(1),
  Schema.isMaxLength(1024),
);
