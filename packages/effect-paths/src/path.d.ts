declare module "node:path" {
  import type {
    AbsoluteDir,
    AbsoluteFile,
    AbsolutePath,
    AnyDir,
    AnyPath,
    RelativeDir,
    RelativeFile,
    RelativePath,
  } from "effect-paths";

  function basename<P extends AnyPath>(
    path: P,
    suffix?: string,
  ): P extends AnyDir ? RelativeDir : RelativeFile;

  function dirname<P extends AnyPath>(
    path: P,
  ): P extends AbsolutePath ? AbsoluteDir : RelativeDir;

  /** join an absolute dir, zero or more relative dirs, and a relative path to get an absolute path */
  function join<T extends AnyPath>(
    ...args: [AbsoluteDir, ...RelativeDir[], T]
  ): T extends RelativeFile
    ? AbsoluteFile
    : T extends RelativeDir
      ? AbsoluteDir
      : Error & { message: "Only the first argument can be an absolute path" };

  // relative paths
  function join<T extends RelativePath>(
    head: RelativeDir,
    ...tail: [...RelativeDir[], T]
  ): T;

  // singleton
  function join<T extends AnyPath>(value: T): T;

  // error
  function join<T extends string[]>(
    ...args: [...T, RelativePath]
  ): Error & {
    message: "You can only pass files in the last position";
  };

  function join<T extends string[]>(
    ...args: T
  ): Extract<T[number], AnyPath> extends never
    ? string
    : Error & {
        message: "You can only pass AnyPath types to path.join";
      };

  /** @deprecated you can only pass files in the last position */
  // function join<Leading, Tail>(
  //   ...args: [...dirs: Leading[], tail: Tail]
  // ): Leading extends AnyFile ? never : Tail;
}
