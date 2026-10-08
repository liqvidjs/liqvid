"use server";

import fsp from "node:fs/promises";
import path from "node:path";

import type { ParameterValues } from "@liqvid/schemas";
import { packageNameToDirName } from "@liqvid/studio-plugin-api";
import { type AbsoluteDir, RelativeDir, RelativeFile } from "effect-paths";

import { DS_STORE, RECORDINGS_DIR } from "#_/conventions";
import { getRoutesDir } from "#_/utils/misc";
import { getParameterizedAssetsDir } from "#_/utils/parameters";

type RecordingFileActionArgs = {
  projectParams: ParameterValues;
  projectPath: RelativeDir;
  recordingName: string;
  pluginPackage: string;
};

function getPluginRecordingDir({
  projectParams,
  projectPath,
  recordingName,
  pluginPackage,
}: RecordingFileActionArgs): AbsoluteDir {
  const pluginDirname = packageNameToDirName(pluginPackage);

  if (
    projectPath.startsWith("/") ||
    projectPath.includes("\\") ||
    projectPath
      .split("/")
      .some((part) => !part || part === "." || part === "..") ||
    Object.values(projectParams).some(
      (value) =>
        typeof value !== "string" ||
        value.includes("/") ||
        value.includes("\\") ||
        value === "." ||
        value === "..",
    ) ||
    !recordingName ||
    recordingName === "." ||
    recordingName === ".." ||
    recordingName.includes("/") ||
    recordingName.includes("\\") ||
    pluginDirname === "." ||
    pluginDirname === ".."
  ) {
    throw new Error("Invalid recording directory");
  }

  const routesDir = getRoutesDir();
  const assetsDir = getParameterizedAssetsDir(
    routesDir,
    projectPath,
    projectParams,
  );

  return path.join(
    assetsDir,
    RECORDINGS_DIR,
    RelativeDir(recordingName),
    pluginDirname,
  );
}

async function getExistingPluginRecordingDir(
  args: RecordingFileActionArgs,
): Promise<AbsoluteDir | undefined> {
  const dir = getPluginRecordingDir(args);
  const routesRealPath = await fsp.realpath(getRoutesDir());
  const dirRealPath = await fsp.realpath(dir).catch(() => undefined);

  if (!dirRealPath) return undefined;

  const relative = path.relative(routesRealPath, dirRealPath);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid recording directory");
  }

  return dirRealPath as AbsoluteDir;
}

/** List regular files in a recording plugin's directory. */
export async function getRecordingPluginFilesAction(
  args: RecordingFileActionArgs,
): Promise<string[]> {
  const root = await getExistingPluginRecordingDir(args);
  if (!root) return [];

  const files: string[] = [];

  const visit = async (directory: AbsoluteDir, prefix = ""): Promise<void> => {
    const entries = await fsp.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      const filename = prefix ? `${prefix}/${entry.name}` : entry.name;
      const entryPath = path.join(directory, RelativeDir(entry.name));

      if (entry.isDirectory()) {
        await visit(entryPath, filename);
      } else if (entry.isFile()) {
        if (filename === DS_STORE) continue;
        files.push(filename);
      }
    }
  };

  await visit(root);
  return files.sort();
}

/** Read a text file from a recording plugin's directory. */
export async function loadRecordingPluginFileAction(
  args: RecordingFileActionArgs & { filename: string },
): Promise<string> {
  if (
    !args.filename ||
    args.filename.startsWith("/") ||
    args.filename.includes("\\") ||
    args.filename
      .split("/")
      .some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error("Invalid recording filename");
  }

  const root = await getExistingPluginRecordingDir(args);
  if (!root) throw new Error("Recording plugin directory does not exist");

  const filePath = path.join(root, RelativeFile(args.filename));
  const fileRealPath = await fsp.realpath(filePath);
  const relative = path.relative(root, fileRealPath);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error("Invalid recording filename");
  }

  const stat = await fsp.stat(fileRealPath);
  if (!stat.isFile()) throw new Error("Recording path is not a file");

  return fsp.readFile(fileRealPath, "utf8");
}
