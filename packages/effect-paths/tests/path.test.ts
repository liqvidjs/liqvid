/** biome-ignore-all lint/correctness/noUnusedVariables: testing types */
import path from "node:path";

import { AbsoluteDir, AbsoluteFile, RelativeDir, RelativeFile } from "../src";

const absoluteDir = AbsoluteDir("");

const relativeDir = RelativeDir("");

const absoluteFile = AbsoluteFile("");

const relativeFile = RelativeFile("");

const plainString = "";

type AbsoluteFirst = Error & {
  message: "Only the first argument can be an absolute path";
};

type FilesLast = Error & {
  message: "You can only pass files in the last position";
};

type AllWrapped = Error & {
  message: "You can only pass AnyPath types to path.join";
};

/* ------------------------------ path.join ------------------------------ */
path.join(absoluteDir, relativeFile) satisfies AbsoluteFile;
path.join(absoluteDir, relativeDir, relativeFile) satisfies AbsoluteFile;

path.join(absoluteDir, relativeDir) satisfies AbsoluteDir;
path.join(absoluteDir, relativeDir, relativeDir) satisfies AbsoluteDir;

path.join(absoluteDir, absoluteDir) satisfies AbsoluteFirst;
path.join(absoluteFile, relativeFile) satisfies FilesLast;

// singletons
path.join(absoluteDir) satisfies AbsoluteDir;
path.join(absoluteFile) satisfies AbsoluteFile;
path.join(relativeFile) satisfies RelativeFile;
path.join(relativeDir) satisfies RelativeDir;

// invalid
path.join(absoluteDir, plainString) satisfies AllWrapped;
