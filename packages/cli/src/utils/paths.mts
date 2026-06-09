import * as os from "node:os";
import * as path from "node:path";

/**
 * Expand ~ to the user's home directory.
 */
export function expandTilde(filepath: string): string {
  if (filepath.startsWith("~/")) {
    return path.join(os.homedir(), filepath.slice(2));
  }
  if (filepath === "~") {
    return os.homedir();
  }
  return filepath;
}
