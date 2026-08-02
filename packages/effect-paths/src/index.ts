import type fs from "node:fs";

import { Brand, Schema } from "effect";

import "./fs.d.ts";
import "./fs-promises.d.ts";
import "./path.d.ts";
import "./process.d.ts";
import "./url.d.ts";

interface ConstBranded<in out B extends Brand.Brand<string>>
  extends Brand.Constructor<B> {
  <const S extends string>(unbranded: S): B & S;
}

/* ------------------------------ absolute ------------------------------ */
/** Absolute directory path */
export type AbsoluteDir<S extends string = string> = S &
  Brand.Brand<"AbsoluteDir">;
export const AbsoluteDir = Brand.nominal() as ConstBranded<AbsoluteDir>;

/** Absolute file path */
export type AbsoluteFile<S extends string = string> = S &
  Brand.Brand<"AbsoluteFile">;
export const AbsoluteFile = Brand.nominal() as ConstBranded<AbsoluteFile>;

/** Absolute file or directory path */
export type AbsolutePath<S extends string = string> =
  | AbsoluteDir<S>
  | AbsoluteFile<S>;

/* ------------------------------ relative ------------------------------ */
/** Relative directory path */
export type RelativeDir<S extends string = string> = S &
  Brand.Brand<"RelativeDir">;
export const RelativeDir = Brand.nominal() as ConstBranded<RelativeDir>;

/** Relative file path */
export type RelativeFile<S extends string = string> = S &
  Brand.Brand<"RelativeFile">;
export const RelativeFile = Brand.nominal() as ConstBranded<RelativeFile>;

/** Relative file or directory path */
export type RelativePath<S extends string = string> =
  | RelativeDir<S>
  | RelativeFile<S>;

/* ------------------------------ any ------------------------------ */
/** Absolute/relative file/directory path */
export type AnyPath<S extends string = string> =
  | AbsolutePath<S>
  | RelativePath<S>;

/** Absolute/relative file path */
export const SchemaAnyFile = Schema.Union([
  Schema.String.pipe(Schema.fromBrand("AbsoluteFile", AbsoluteFile)),
  Schema.String.pipe(Schema.fromBrand("RelativeFile", RelativeFile)),
]);

/** Absolute/relative file path */
export type AnyFile<S extends string = string> =
  | AbsoluteFile<S>
  | RelativeFile<S>;

/** Absolute/relative directory path */
export const SchemaAnyDir = Schema.Union([
  Schema.String.pipe(Schema.fromBrand("AbsoluteDir", AbsoluteDir)),
  Schema.String.pipe(Schema.fromBrand("RelativeDir", RelativeDir)),
]);

/** Absolute/relative directory path */
export type AnyDir<S extends string = string> = AbsoluteDir<S> | RelativeDir<S>;

/* ------------------------------ file extensions ------------------------------ */
/** File extension */
export type FileExtn<S extends string = string> = S & Brand.Brand<"FileExtn">;

export const FileExtn = Brand.nominal() as ConstBranded<FileExtn>;

/* ------------------------------ utils ------------------------------ */
export type AbsoluteToRelative<P extends AbsolutePath> = P extends AbsoluteDir
  ? RelativeDir
  : P extends AbsoluteFile
    ? RelativeFile
    : P;

export type RelativeToAbsolute<P extends RelativePath> = P extends RelativeDir
  ? AbsoluteDir
  : P extends RelativeFile
    ? AbsoluteFile
    : P;

/* ------------------------------ Dirent ------------------------------ */
export interface Dirent<Name extends RelativePath = RelativePath>
  extends Omit<fs.Dirent<Name>, "isDirectory" | "isFile" | "name"> {
  isDirectory(): this is Dirent<RelativeDir>;
  isFile(): this is Dirent<RelativeFile>;
  name: Name;
  parentPath: AbsoluteDir;
}
