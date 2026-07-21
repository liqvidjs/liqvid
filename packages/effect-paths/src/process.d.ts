/*
 * biome-ignore lint/correctness/noUnusedImports: need to load this to override Node types,
 * and need to add `type` to avoid errors
 */
import type _ from "node";

declare global {
  // 2. Target the exact global namespace object
  namespace NodeJS {
    interface Process {
      cwd(): import("effect-paths").AbsoluteDir;
    }
  }

  // 3. Force overwrite the global variable instance itself
  var process: NodeJS.Process;
}
