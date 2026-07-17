export declare global {
  export namespace NodeJS {
    // import type { AbsoluteDir } from "effect-paths";

    export interface Process {
      cwd(): import("effect-paths").AbsoluteDir;
    }
  }
}
