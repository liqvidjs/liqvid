export type Directory = {
  [key: string]: Directory | (() => unknown);
};

export interface ProjectFile {
  filename: string;
  mime: string;
  version?: string;
}

declare const directorySource: unique symbol;

type FileNamesOf<D extends Directory> = {
  [key in string & keyof D]: D[key] extends Directory
    ? `${key}/` | `${key}/${FileNamesOf<D[key]>}`
    : key;
}[string & keyof D];

/** File paths associated with their source directory type. */
export type FileNames<D extends Directory> = FileNamesOf<D> & {
  readonly [directorySource]?: D;
};

type Files<T extends string> = T extends `${string}/` ? never : T;

type DirectoryLike = Directory | string;

type SourceDirectory<D> = D extends {
  readonly [directorySource]?: infer Source extends Directory;
}
  ? Source
  : never;

type FilePaths<D extends DirectoryLike> = D extends string
  ? D
  : FileNamesOf<Extract<D, Directory>>;

type FileType<
  D extends Directory,
  P extends string,
> = P extends `${infer Head}/${infer Tail}`
  ? D[Head] extends Directory
    ? FileType<D[Head], Tail>
    : unknown
  : P extends keyof D
    ? D[P] extends () => infer T
      ? T
      : unknown
    : unknown;

type FetchType<D extends DirectoryLike, P extends string> = D extends Directory
  ? FileType<D, P>
  : FileType<SourceDirectory<D>, P>;

type Dirs<T extends string> = T extends `${infer Head}/${infer Tail}`
  ? Head | `${Head}/${Dirs<Tail>}`
  : never;

type ChildDirectory<
  D extends DirectoryLike,
  P extends string,
> = D extends string
  ? Resolve<SourceDirectory<D>, P>
  : D extends Directory
    ? Resolve<D, P>
    : never;

const globalFetchCache = new Map<string, unknown>();

export class DirectoryHelper<
  DS extends DirectoryLike,
  TemplateVars extends string = string,
> {
  private readonly dirname: string;

  constructor(dirname = "") {
    this.dirname = dirname.replace(/\/$/, "");
  }

  /** get a new DirectoryHelper for a subdirectory */
  dir<D extends Dirs<FilePaths<DS>>>(
    dirname: D,
  ): DirectoryHelper<ChildDirectory<DS, D>, TemplateVars> {
    return new DirectoryHelper(`${this.dirname}/${dirname}`);
  }

  /** fetch a JSON file */
  async fetch<F extends Files<FilePaths<DS>>>(
    filename: F,
    options?: {
      /** @default json */
      type?: "json";

      /** optional version string */
      v?: string;
    },
  ): Promise<FetchType<DS, F>>;
  async fetch<F extends Files<FilePaths<DS>>>(
    filename: F,
    options: { type: "blob"; v?: string },
  ): Promise<ArrayBuffer>;
  async fetch<F extends Files<FilePaths<DS>>>(
    filename: F,
    options: { type: "raw"; v?: string },
  ): Promise<Response>;
  async fetch<F extends Files<FilePaths<DS>>>(
    filename: F,
    options: { type: "text"; v?: string },
  ): Promise<string>;
  async fetch<T>(
    filename: Files<FilePaths<DS>>,
    options?: {
      type: "blob" | "json" | "raw" | "text";
      v?: string;
    },
  ): Promise<T>;
  async fetch(
    filename: Files<FilePaths<DS>>,
    options?: {
      type?: "blob" | "json" | "raw" | "text";
      v?: string;
    },
  ): Promise<unknown> {
    // TODO: maybe support RSC here
    if (import.meta.env.SSR) {
      return null;
    }

    const url = this.file(filename, options?.v);

    if (!globalFetchCache.has(url)) {
      globalFetchCache.set(
        url,
        fetch(url).then((res) => {
          switch (options?.type) {
            case "blob":
              return res.arrayBuffer();
            case "raw":
              return res;
            case "text":
              return res.text();
            default:
              return res.json();
          }
        }),
      );
    }

    return globalFetchCache.get(url) as Promise<unknown>;
  }

  /**
   * get the fully qualified name of a file
   * TODO: support versioning
   */
  file(filename: Files<FilePaths<DS>>, _version?: string) {
    return `${this.dirname}/${filename}`;
  }

  /** substitute variables into the dirname of this helper */
  interpolate<V extends TemplateVars>(
    vars: Record<V, string>,
  ): DirectoryHelper<DS, Exclude<TemplateVars, V>> {
    let dirname = this.dirname;
    for (const [key, value] of Object.entries(vars) as [
      TemplateVars,
      string,
    ][]) {
      dirname = dirname.replace(`{${key}}`, value);
    }
    return new DirectoryHelper<DS>(dirname);
  }

  /** when you need to reference a pattern, e.g. "thumbs/%s.png", instead of a single file */
  pattern(pattern: string): string {
    return `${this.dirname}/${pattern}`;
  }
}

type Resolve<
  D extends Directory,
  P extends string,
> = P extends `${infer Head extends string & keyof D}/${infer Tail}`
  ? D[Head] extends Directory
    ? Resolve<D[Head], Tail>
    : never
  : P extends keyof D
    ? D[P] extends Directory
      ? D[P]
      : never
    : never;

export class ServerDirectoryHelper<D extends Directory> {
  readonly #files: D;

  constructor(files: D) {
    this.#files = files;
  }

  /** get a new ServerDirectoryHelper for a subdirectory */
  dir<Dir extends Dirs<FileNames<D>>>(
    dirname: Dir,
  ): ServerDirectoryHelper<Resolve<D, Dir>> {
    const newFiles = dirname.split("/").reduce((current, part) => {
      const child = current[part];
      if (child === undefined || typeof child !== "object" || child === null) {
        throw new Error(`Directory "${dirname}" does not exist`);
      }
      return child as Directory;
    }, this.#files as Directory) as Resolve<D, Dir>;

    return new ServerDirectoryHelper(newFiles);
  }

  /** Test for existence of a file */
  has(filename: Files<FileNames<D>> | (string & {})) {
    const parts = filename.split("/");

    const match = (current: Directory, index: number): boolean => {
      if (index === parts.length) {
        return true;
      }

      const part = parts[index]!;

      if (part === "*") {
        for (const key of Object.keys(current)) {
          const child = current[key];
          if (
            typeof child === "object" &&
            child !== null &&
            match(child as Directory, index + 1)
          ) {
            return true;
          }
        }
        return false;
      }

      const child = current[part];
      if (child === undefined) {
        return false;
      }

      return match(child as Directory, index + 1);
    };

    return match(this.#files, 0);
  }
}
