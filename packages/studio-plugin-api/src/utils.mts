import { RelativeDir } from "effect-paths";

export function packageNameToDirName(packageName: string) {
  return RelativeDir(packageName.replace(/\//g, "@"));
}

export function dirNameToPackageName(dirname: RelativeDir) {
  return dirname.replace(/(?!^)@/g, "/");
}
