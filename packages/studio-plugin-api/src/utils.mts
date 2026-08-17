import { RelativeDir } from "effect-paths";

export function packageNameToDirName(packageName: string) {
  return RelativeDir(packageName.replaceAll("/", "+"));
}

export function dirNameToPackageName(dirname: RelativeDir) {
  return dirname.replaceAll("+", "/");
}
