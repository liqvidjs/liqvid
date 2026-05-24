import { readdirSync, statSync } from "node:fs";
import * as fsp from "node:fs/promises";
import { readdir } from "node:fs/promises";
import * as path from "node:path";

import { Err, Maybe, type Result, safeJsonParse } from "@liqvid/fp";
import { fromZod } from "@liqvid/fp/zod";
import type { z } from "zod";

import type { Awaitable } from "../types.mts";

export async function loadJson<T extends z.ZodType>(
  Model: T,
  filename: string,
): Promise<
  Result<
    z.core.output<T>,
    z.ZodError<z.core.output<T>> | SyntaxError | NodeJS.ErrnoException
  >
> {
  try {
    const file = await fsp.readFile(filename, "utf8");

    return safeJsonParse<z.core.output<T>>(file).flatMap((json) =>
      fromZod(Model.safeParse(json)),
    );
  } catch (err) {
    return Err(err as NodeJS.ErrnoException);
  }
}

export function findUpwards(
  dirname: string,
  callback: (dir: string) => boolean | Promise<boolean>,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const checkDirectory = async (dir: string): Promise<string | null> => {
      try {
        // Check if current directory matches callback
        const result = await Promise.resolve(callback(dir));
        if (result) {
          return dir;
        }

        // Get parent directory
        const parentDir = path.dirname(dir);

        // If we've reached the root directory, stop searching
        if (parentDir === dir) {
          return null;
        }

        // Continue searching upwards
        return await checkDirectory(parentDir);
      } catch (error) {
        reject(error);
        return null;
      }
    };

    checkDirectory(dirname).then(resolve).catch(reject);
  });
}

/** Callback to process a file */
export type WalkingCallback = (file: {
  basename: string;
  dirname: string;
  filename: string;
}) => Awaitable<void>;

/** Walk a directory recursively */
export async function walkDir(
  /** Directory to walk */
  dir: string,

  /** Callback to run for each file */
  callback: WalkingCallback,

  /** Callback to decide whether to descend into a directory */
  shouldProcessDir: (dir: {
    basename: string;
    dirname: string;
  }) => Awaitable<boolean> = () => true,
) {
  const files = await readdir(dir, { withFileTypes: true });

  await Promise.all(
    files.map(async (dirent) => {
      const qualified = path.join(dirent.parentPath, dirent.name);

      if (dirent.isDirectory()) {
        if (shouldProcessDir({ basename: dirent.name, dirname: qualified })) {
          await walkDir(qualified, callback, shouldProcessDir);
        }
      } else if (dirent.isFile()) {
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
  dir: string,

  /** Callback to call for each file */
  callback: (path: string) => void,
) {
  const files = readdirSync(dir);

  for (const file of files) {
    const qualified = path.join(dir, file);
    const stats = statSync(qualified);

    if (stats.isDirectory()) {
      walkDirSync(qualified, callback);
    } else if (stats.isFile()) {
      callback(qualified);
    }
  }
}

/**
 * Get the path to the Biome executable, if available
 */
export async function getBiomePath(dirname: string): Promise<Maybe<string>> {
  const packageDir = await findUpwards(dirname, async (dir) => {
    const files = await fsp.readdir(dir);
    return files.includes("package.json");
  });

  return Maybe.nullish(packageDir).map((dir) =>
    path.join(dir, "node_modules", ".bin", "biome"),
  );
}
