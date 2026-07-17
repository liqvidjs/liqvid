import "./effect-filesystem.d.ts";
import "./fs-promises.d.ts";
import "./fs.d.ts";
import "./path.d.ts";
import "./process.d.ts";
import "./url.d.ts";

import { Brand } from "effect";

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
