import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";

import { Effect, Option } from "effect";
import {
  type AbsoluteDir,
  type AbsoluteFile,
  RelativeDir,
  RelativeFile,
} from "effect-paths";

import type { Awaitable } from "../types.mts";

export function findUpwards(
  dirname: AbsoluteDir,
  callback: (dir: AbsoluteDir) => boolean | Promise<boolean>,
): Promise<Option.Option<AbsoluteDir>> {
  return new Promise((resolve, reject) => {
    const checkDirectory = async (dir: AbsoluteDir) => {
      try {
        // Check if current directory matches callback
        const result = await Promise.resolve(callback(dir));
        if (result) {
          return Option.some(dir);
        }

        // Get parent directory
        const parentDir = path.dirname(dir);

        // If we've reached the root directory, stop searching
        if (parentDir === dir) {
          return Option.none();
        }

        // Continue searching upwards
        return await checkDirectory(parentDir);
      } catch (error) {
        reject(error);
        return Option.none();
      }
    };

    checkDirectory(dirname).then(resolve).catch(reject);
  });
}

/** Callback to process a file */
export type WalkingCallback = (file: {
  basename: RelativeFile;
  dirname: AbsoluteDir;
  filename: AbsoluteFile;
}) => Awaitable<void>;

/** Walk a directory recursively */
export async function walkDir(
  /** Directory to walk */
  dir: AbsoluteDir,

  /** Callback to run for each file */
  callback: WalkingCallback,

  /** Callback to decide whether to descend into a directory */
  shouldProcessDir: (dir: {
    basename: RelativeDir;
    dirname: AbsoluteDir;
  }) => Awaitable<boolean> = () => true,
) {
  const files = await fsp.readdir(dir, { withFileTypes: true });

  await Promise.all(
    files.map(async (dirent) => {
      if (dirent.isDirectory()) {
        const qualified = path.join(dirent.parentPath, dirent.name);

        if (
          shouldProcessDir({
            basename: dirent.name,
            dirname: qualified,
          })
        ) {
          await walkDir(qualified, callback, shouldProcessDir);
        }
      } else if (dirent.isFile()) {
        const qualified = path.join(dirent.parentPath, dirent.name);

        await callback({
          basename: dirent.name,
          dirname: dirent.parentPath,
          filename: qualified,
        });
      }
    }),
  );
}

/** Synchronously walk a directory recursively */
export function walkDirSync(
  /** Directory to walk */
  dir: AbsoluteDir,

  /** Callback to call for each file */
  callback: (path: AbsoluteFile) => void,
) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const qualified = path.join(dir, file);
    const stats = fs.statSync(qualified);

    if (stats.isDirectory()) {
      walkDirSync(qualified as AbsoluteDir, callback);
    } else if (stats.isFile()) {
      callback(qualified as AbsoluteFile);
    }
  }
}

/**
 * Get the path to the Biome executable, if available
 */
export const getBiomePath = Effect.fnUntraced(function* (dirname: AbsoluteDir) {
  const packageDir = yield* Effect.promise(() =>
    findUpwards(dirname, async (dir) => {
      const files = await fsp.readdir(dir);
      return files.includes(RelativeFile("package.json"));
    }),
  );

  return packageDir.pipe(
    Option.map((dir) =>
      path.join(
        dir,
        RelativeDir("node_modules"),
        RelativeDir(".bin"),
        RelativeFile("biome"),
      ),
    ),
  );
});
