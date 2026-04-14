export function packageNameToDirName(packageName: string) {
  return packageName.replace(/\//g, "@");
}

export function dirNameToPackageName(dirname: string) {
  return dirname.replace(/(?!^)@/g, "/");
}
