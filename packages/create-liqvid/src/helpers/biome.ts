import spawn from "cross-spawn";

import type { PackageManager } from "./get-pkg-manager.ts";

/**
 * Runs Biome on `next.config.ts` using the package manager to execute the
 * locally installed Biome binary.
 *
 * Assumes the current working directory is the project root where Biome is
 * installed.
 */
export async function runBiome(packageManager: PackageManager): Promise<void> {
  return new Promise((resolve, reject) => {
    // Determine the command and arguments based on the package manager
    let command: string;
    let args: string[];

    const biomeArgs = ["biome", "check", "--write", "next.config.ts"];

    switch (packageManager) {
      case "npm":
        command = "npm";
        args = ["exec", "--", ...biomeArgs];
        break;
      case "yarn":
        command = "yarn";
        args = ["exec", "--", ...biomeArgs];
        break;
      case "pnpm":
        command = "pnpm";
        args = ["exec", ...biomeArgs];
        break;
      case "bun":
        command = "bun";
        args = ["x", ...biomeArgs];
        break;
      default:
        packageManager satisfies never;
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    const child = spawn(command, args, {
      env: {
        ...process.env,
      },
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`biome exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}
