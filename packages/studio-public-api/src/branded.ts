import { Brand, Schema } from "effect";

export type UserId = string & Brand.Brand<"UserId">;

export const UserId = Brand.nominal<UserId>();

export const SchemaUserId = Schema.String.pipe(
  Schema.fromBrand("UserId", UserId),
);
