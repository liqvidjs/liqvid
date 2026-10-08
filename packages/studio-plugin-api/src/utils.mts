import { RelativeDir } from "effect-paths";

import type { RecordingName } from "./types.mts";

export function packageNameToDirName(packageName: string) {
  return RelativeDir(packageName.replaceAll("/", "+"));
}

export function dirNameToPackageName(dirname: RelativeDir) {
  return dirname.replaceAll("+", "/");
}

export function isValidRecordingName(name: string): name is RecordingName {
  return /^[a-zA-Z0-9+_.-]+$/.test(name);
}
