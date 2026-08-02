import * as os from "node:os";
import * as path from "node:path";

import type { AnyPath } from "effect-paths";

/**
 * Expand ~ to the user's home directory.
 */
export function expandTilde<T extends AnyPath>(filepath: T): T {
  if (filepath.startsWith("~/")) {
    return path.join(os.homedir(), filepath.slice(2)) as T;
  }
  if (filepath === "~") {
    return os.homedir() as T;
  }
  return filepath;
}
