/* eslint-disable import/no-extraneous-dependencies */

import { copyFile, mkdir } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

import fastglob from "fast-glob";

interface CopyOption {
  cwd?: string;
  rename?: (basename: string) => string;
  parents?: boolean;
}

const identity = (x: string) => x;

export const copy = async (
  src: string | string[],
  dest: string,
  { cwd, rename = identity, parents = true }: CopyOption = {},
) => {
  const source = typeof src === "string" ? [src] : src;

  if (source.length === 0 || !dest) {
    throw new TypeError("`src` and `dest` are required");
  }

  const sourceFiles = await fastglob.async(source, {
    absolute: false,
    cwd,
    dot: true,
    stats: false,
  });

  const destRelativeToCwd = cwd ? resolve(cwd, dest) : dest;

  return Promise.all(
    sourceFiles.map(async (p) => {
      const dirName = dirname(p);
      const baseName = rename(basename(p));

      const from = cwd ? resolve(cwd, p) : p;
      const to = parents
        ? join(destRelativeToCwd, dirName, baseName)
        : join(destRelativeToCwd, baseName);

      // Ensure the destination directory exists
      await mkdir(dirname(to), { recursive: true });

      return copyFile(from, to);
    }),
  );
};
