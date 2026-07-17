declare module "node:fs" {
  import type {
    AbsoluteDir,
    AbsoluteFile,
    AnyPath,
    RelativePath,
  } from "effect-paths";

  function readdirSync<P extends AnyPath>(
    path: P,
    options?:
      | {
          encoding: BufferEncoding | null;
          withFileTypes?: false | undefined;
          recursive?: boolean | undefined;
        }
      | BufferEncoding
      | null,
  ): P extends AbsoluteDir ? RelativePath[] : never;

  // readFileSync
  function readFileSync<P extends AnyPath>(
    ...args: [path: P, ...unknown[]]
  ): P extends AbsoluteFile ? string : never;

  // watch
  function watch(
    filename: AbsoluteDir,
    options?: WatchOptionsWithStringEncoding | BufferEncoding | null,
    listener?: WatchListener<RelativePath>,
  ): FSWatcher;
}
