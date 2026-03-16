import type { Directory } from "./types/assets.mts";

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

export class DirectoryHelper<DS extends string> {
  constructor(private dirname = "") {}

  dir<D extends Dirs<DS>>(
    dirname: D,
  ): DirectoryHelper<Exclude<StripPrefix<DS, `${D}/`>, "">> {
    return new DirectoryHelper(`${this.dirname}/${dirname}`);
  }

  file(filename: Files<DS>, version?: string): string {
    return `${this.dirname}/${filename}`;
  }
}

export type Awaitable<T> = T | Promise<T>;
