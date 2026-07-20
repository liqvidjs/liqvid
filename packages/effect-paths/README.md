# effect-paths

This provides helpers for working with paths in [Effect-TS](https://effect.website). Specifically, it provides branded types for absolute vs relative paths, and for directories vs files. We also extend Node types (`fs`, `fs/promises`, `path`, etc.) to use these branded types.

 This uses Effect v4 Beta, although it may also work with v3, I haven't tried.

## Installation

```bash
npm install effect-paths
```

## Example

```ts
import fs from "node:fs";
import path from "node:path";

import {
  type AbsoluteDir,
  type AbsoluteFile,
  type AbsolutePath,
  RelativeDir,
  RelativeFile,
  type RelativePath,
} from "effect-paths";

// process.cwd() now returns AbsoluteDir
process.cwd() satisfies AbsoluteDir;

/* ------------------------------ path.join examples ------------------------------ */
// joining absolute dir to relative file/dir gives absolute file/dir
path.join(process.cwd(), RelativeFile("project.json")) satisfies AbsoluteFile;
path.join(process.cwd(), RelativeDir("config")) satisfies AbsoluteDir;

// AbsolutePath = AbsoluteDir | AbsoluteFile
path.join(
  process.cwd(),
  RelativeDir("config") as RelativePath,
) satisfies AbsolutePath;

// joining relative dir to relative file/dir gives relative file/dir
path.join(RelativeDir("a"), RelativeDir("b")) satisfies RelativeDir;
path.join(
  RelativeDir("a"),
  RelativeFile("package.json"),
) satisfies RelativeFile;

// RelativePath = RelativeDir | RelativeFile
path.join(
  RelativeDir("a"),
  RelativeFile("package.json") as RelativePath,
) satisfies RelativePath;

// we also override the types to give error messages for invalid combinations.
// of course path.join still returns a string here, but we change it to Error
// and add a deprecation warning to flag this at the type level
path.join(RelativeFile("x"), RelativeFile("a")) satisfies Error & {
  message: "You can only pass files in the last position";
};

/* ------------------------------ fs examples ------------------------------ */
// passing a plain string produces string[] as usual
fs.readdirSync(".");

// passing an AbsoluteDir produces RelativePath[]
fs.readdirSync(process.cwd()) satisfies RelativePath[];

// with `withFileTypes: true`, Dirent gets proper typing
const entries = fs.readdirSync(process.cwd(), { withFileTypes: true });
const entry = entries[0]!;

entry.parentPath satisfies AbsoluteDir;
entry.name satisfies RelativePath;
```
