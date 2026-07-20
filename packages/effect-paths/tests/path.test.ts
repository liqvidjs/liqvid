/** biome-ignore-all lint/correctness/noUnusedVariables: testing types */
import path from "node:path";

import {
  AbsoluteDir,
  AbsoluteFile,
  type AbsolutePath,
  type AnyDir,
  type AnyFile,
  type AnyPath,
  type FileExtn,
  RelativeDir,
  RelativeFile,
  type RelativePath,
} from "../src";

const absoluteDir = AbsoluteDir("");

const relativeDir = RelativeDir("");

const absoluteFile = AbsoluteFile("");

const relativeFile = RelativeFile("");

const anyFile = absoluteFile as AnyFile;

const anyDir = absoluteDir as AnyDir;

const anyPath = anyFile as AnyPath;

const plainString = "";

type ErrorAbsoluteFirst = Error & {
  message: "You can only pass absolute paths in the first position";
};

type ErrorFilesLast = Error & {
  message: "You can only pass files in the last position";
};

type ErrorAllWrapped = Error & {
  message: "If any arguments to path.join are AllPath, all of them must be";
};

/* ------------------------------ path.basename ------------------------------ */
path.basename(absoluteDir) satisfies RelativeDir;
path.basename(absoluteFile) satisfies RelativeFile;

/* ------------------------------ path.dirname ------------------------------ */
path.dirname(absoluteDir) satisfies AbsoluteDir;
path.dirname(absoluteFile) satisfies AbsoluteDir;
path.dirname(relativeDir) satisfies RelativeDir;
path.dirname(relativeFile) satisfies RelativeDir;

/* ------------------------------ path.extname ------------------------------ */
path.extname(absoluteFile) satisfies FileExtn;

/* ------------------------------ path.isAbsolute ------------------------------ */
if (path.isAbsolute(anyDir)) {
  anyDir satisfies AbsoluteDir;
} else {
  anyDir satisfies RelativeDir;
}

if (path.isAbsolute(anyFile)) {
  anyFile satisfies AbsoluteFile;
} else {
  anyFile satisfies RelativeFile;
}

if (path.isAbsolute(anyPath)) {
  anyPath satisfies AbsolutePath;
} else {
  anyPath satisfies RelativePath;
}

/* ------------------------------ path.join ------------------------------ */
path.join(absoluteDir, relativeFile) satisfies AbsoluteFile;
path.join(absoluteDir, relativeDir, relativeFile) satisfies AbsoluteFile;

path.join(absoluteDir, relativeDir) satisfies AbsoluteDir;
path.join(absoluteDir, relativeDir, relativeDir) satisfies AbsoluteDir;
path.join(
  absoluteDir,
  relativeDir,
  relativeDir,
  relativeDir,
) satisfies AbsoluteDir;

path.join(relativeDir, relativeFile) satisfies RelativeFile;
path.join(relativeDir, relativeDir) satisfies RelativeDir;

// singletons
path.join(absoluteDir) satisfies AbsoluteDir;
path.join(absoluteFile) satisfies AbsoluteFile;
path.join(relativeFile) satisfies RelativeFile;
path.join(relativeDir) satisfies RelativeDir;

// invalid
path.join(absoluteDir, absoluteDir) satisfies ErrorAbsoluteFirst;
path.join(absoluteFile, relativeFile) satisfies ErrorFilesLast;
path.join(absoluteDir, plainString) satisfies ErrorAllWrapped;

/* ------------------------------ path.normalize ------------------------------ */
path.normalize(absoluteDir) satisfies AbsoluteDir;
path.normalize(absoluteFile) satisfies AbsoluteFile;
path.normalize(relativeDir) satisfies RelativeDir;
path.normalize(relativeFile) satisfies RelativeFile;

/* ------------------------------ path.resolve ------------------------------ */
path.resolve(relativeDir) satisfies AbsoluteDir;
path.resolve(relativeFile) satisfies AbsoluteFile;
path.resolve(anyPath) satisfies AbsolutePath;
