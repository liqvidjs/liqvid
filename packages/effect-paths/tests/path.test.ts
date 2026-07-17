/** biome-ignore-all lint/correctness/noUnusedVariables: testing types */
import path from "node:path";

import { AbsoluteDir, AbsoluteFile, RelativeDir, RelativeFile } from "../src";

const absoluteDir = AbsoluteDir("");

const relativeDir = RelativeDir("");

const absoluteFile = AbsoluteFile("");

const relativeFile = RelativeFile("");

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

/* ------------------------------ path.join ------------------------------ */
path.join(absoluteDir, relativeFile) satisfies AbsoluteFile;
path.join(absoluteDir, relativeDir, relativeFile) satisfies AbsoluteFile;

path.join(absoluteDir, relativeDir) satisfies AbsoluteDir;
path.join(absoluteDir, relativeDir, relativeDir) satisfies AbsoluteDir;

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
