import type fs from "node:fs";

declare module "node:fs" {
  import type { AbsoluteDir, Dirent, RelativePath } from "effect-paths";

  function readdirSync<P extends fs.PathLike>(
    path: P,
    options?:
      | {
          encoding: BufferEncoding | null;
          withFileTypes?: false | undefined;
          recursive?: boolean | undefined;
        }
      | BufferEncoding
      | null,
  ): P extends import("effect-paths").AbsoluteDir
    ? RelativePath[]
    : P extends import("effect-paths").AnyPath
      ? Error & { message: "must pass an absolute directory" }
      : string[];

  function readdirSync(
    path: PathLike,
    options: ObjectEncodingOptions & {
      withFileTypes: true;
      recursive?: boolean | undefined;
    },
  ): Dirent[];

  // watch
  function watch(
    filename: AbsoluteDir,
    options?: WatchOptionsWithStringEncoding | BufferEncoding | null,
    listener?: WatchListener<RelativePath>,
  ): FSWatcher;
}
