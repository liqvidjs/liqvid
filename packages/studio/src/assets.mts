export interface Directory {
  [key: string]: Directory | null;
}

export interface ProjectFile {
  filename: string;
  mime: string;
  version?: string;
}

export type FileNames<D extends Directory> = {
  [key in string & keyof D]: D[key] extends Directory
    ? `${key}/` | `${key}/${FileNames<D[key]>}`
    : key;
}[string & keyof D];

type Files<T extends string> = T extends `${string}/` ? never : T;

type Dirs<T extends string> = T extends `${infer Head}/${infer Tail}`
  ? Head | `${Head}/${Dirs<Tail>}`
  : never;

type StripPrefix<
  T extends string,
  S extends string,
> = T extends `${S}${infer Tail}` ? Tail : never;

const globalFetchCache = new Map<string, unknown>();

export class DirectoryHelper<
  DS extends string,
  TemplateVars extends string = string,
> {
  private dirname: string;

  constructor(dirname = "") {
    this.dirname = dirname.replace(/\/$/, "");
  }

  /** get a new DirectoryHelper for a subdirectory */
  dir<D extends Dirs<DS>>(
    dirname: D,
  ): DirectoryHelper<Exclude<StripPrefix<DS, `${D}/`>, "">, TemplateVars> {
    return new DirectoryHelper(`${this.dirname}/${dirname}`);
  }

  /** fetch a JSON file */
  async fetch<T>(
    filename: Files<DS>,
    options?: {
      /** @default json */
      type: "blob" | "json" | "raw" | "text";

      /** optional version string */
      v?: string;
    },
  ): Promise<T> {
    const url = this.file(filename, options?.v);

    if (!globalFetchCache.has(url)) {
      globalFetchCache.set(
        url,
        fetch(url).then((res) => {
          switch (options?.type) {
            case "blob":
              return res.arrayBuffer;
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

    return globalFetchCache.get(url) as Promise<T>;
  }

  /**
   * get the fully qualified name of a file
   * TODO: support versioning
   */
  file(filename: Files<DS>, _version?: string) {
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
