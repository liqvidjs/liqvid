declare module "node:path" {
  import type {
    AbsoluteDir,
    AbsoluteFile,
    AbsolutePath,
    AbsoluteToRelative,
    AnyDir,
    AnyPath,
    FileExtn,
    RelativeDir,
    RelativeFile,
    RelativePath,
    RelativeToAbsolute,
  } from "effect-paths";

  function basename<P extends AnyPath>(
    path: P,
    suffix?: string,
  ): P extends AnyDir ? RelativeDir : RelativeFile;

  function dirname<P extends AnyPath>(
    path: P,
  ): P extends AbsolutePath ? AbsoluteDir : RelativeDir;

  function extname<P extends AnyPath>(path: P): FileExtn;

  function isAbsolute<P extends string>(
    path: P,
  ): path is P extends AnyDir
    ? AbsoluteDir
    : P extends AnyFile
      ? AbsoluteFile
      : boolean;

  /* ------------------------------ join ------------------------------ */
  function join<P extends AnyPath>(singleton: P): P;

  function join<T extends RelativePath>(
    head: AbsoluteDir,
    ...tail: [...RelativeDir[], T]
  ): RelativeToAbsolute<T>;

  function join<T extends RelativePath>(...args: [...RelativeDir[], T]): T;

  /** @deprecated You can only pass files in the last position */
  function join<T extends AnyPath[]>(
    ...args: [...T, RelativePath]
  ): Extract<T[number], AnyFile> extends never
    ? never
    : Error & { message: "You can only pass files in the last position" };

  /** @deprecated You can only pass absolute paths in the first position */
  function join<T extends AnyPath[]>(
    ...args: [AnyDir, ...T]
  ): Extract<T[number], AbsolutePath> extends never
    ? never
    : Error & {
        message: "You can only pass absolute paths in the first position";
      };

  /** @deprecated If any arguments to path.join are AllPath, all of them must be */
  function join<T extends string[]>(
    ...args: T
  ): Extract<T[number], AnyPath> extends never
    ? string
    : T[number] extends AnyPath
      ? never
      : Error & {
          message: "If any arguments to path.join are AllPath, all of them must be";
        };

  /* ------------------------------ /join ------------------------------ */
  function normalize<P extends AnyPath>(path: P): P;

  function relative<P extends AnyPath>(
    from: AnyPath,
    to: P,
  ): AbsoluteToRelative<P>;

  function resolve<T extends string[]>(
    ...paths: T
  ): T extends [...string[], infer Tail extends AnyPath]
    ? RelativeToAbsolute<Tail>
    : AbsolutePath;
}
