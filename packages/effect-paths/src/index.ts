import type fs from "node:fs";

import { Brand } from "effect";

import "./fs-promises.d.ts";
import "./fs.d.ts";
import "./import-meta.d.ts";
import "./path.d.ts";
import "./process.d.ts";
import "./url.d.ts";

/* ------------------------------ absolute ------------------------------ */
/** Absolute directory path */
export type AbsoluteDir = string & Brand.Brand<"AbsoluteDir">;
export const AbsoluteDir = Brand.nominal<AbsoluteDir>();

/** Absolute file path */
export type AbsoluteFile = string & Brand.Brand<"AbsoluteFile">;
export const AbsoluteFile = Brand.nominal<AbsoluteFile>();

/** Absolute file or directory path */
export type AbsolutePath = AbsoluteDir | AbsoluteFile;

/* ------------------------------ relative ------------------------------ */
/** Relative directory path */
export type RelativeDir = string & Brand.Brand<"RelativeDir">;
export const RelativeDir = Brand.nominal<RelativeDir>();

/** Relative file path */
export type RelativeFile = string & Brand.Brand<"RelativeFile">;
export const RelativeFile = Brand.nominal<RelativeFile>();

/** Relative file or directory path */
export type RelativePath = RelativeDir | RelativeFile;

/* ------------------------------ any ------------------------------ */
/** Absolute/relative file/directory path */
export type AnyPath = AbsolutePath | RelativePath;

/** Absolute/relative file path */
export type AnyFile = AbsoluteFile | RelativeFile;

/** Absolute/relative directory path */
export type AnyDir = AbsoluteDir | RelativeDir;

/* ------------------------------ file extensions ------------------------------ */
/** File extension */
export type FileExtn = string & Brand.Brand<"FileExtn">;

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
