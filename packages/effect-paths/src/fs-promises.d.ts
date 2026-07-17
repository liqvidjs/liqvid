import type { PathLike } from "node:fs";

declare module "node:fs/promises" {
  import type { AbsoluteDir, RelativePath } from "effect-paths";

  /**
   * Asynchronous readdir(3) - read a directory.
   * @param path A path to a file. If a URL is provided, it must use the `file:` protocol.
   * @param options If called with `withFileTypes: true` the result data will be an array of Dirent.
   */
  function readdir<P extends PathLike>(
    path: P,
    options: ObjectEncodingOptions & {
      withFileTypes: true;
      recursive?: boolean | undefined;
    },
  ): Promise<
    P extends import("effect-paths").AbsoluteDir
      ? import("effect-paths").Dirent[]
      : P extends import("effect-paths").AnyPath
        ? Error & { message: "Must pass an absolute directory" }
        : Dirent[]
  >;

  function readdir<P extends PathLike>(
    path: P,
    options?:
      | (ObjectEncodingOptions & {
          withFileTypes?: false | undefined;
          recursive?: boolean | undefined;
        })
      | BufferEncoding
      | null,
  ): Promise<
    P extends import("effect-paths").AbsoluteDir
      ? RelativePath[]
      : P extends import("effect-paths").AnyPath
        ? Error & { message: "Must pass an absolute directory" }
        : string[]
  >;

  // watch
  function watch(
    filename: AbsoluteDir,
    options?: WatchOptionsWithStringEncoding | BufferEncoding | null,
    listener?: WatchListener<RelativePath>,
  ): FSWatcher;
}
