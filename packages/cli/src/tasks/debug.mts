import type { CommandModule } from "yargs";

import { BROWSER_EXECUTABLE, DEFAULT_CONFIG, parseConfig } from "./config.mts";

/**
 * Options for the debug command.
 */
export interface DebugOptions {
  /** Path to browser executable (optional, will auto-detect) */
  browserExecutable?: string;

  /** URL to open */
  url: string;
}

/**
 * Open the given URL in a visible (non-headless) Puppeteer browser.
 *
 * @example
 * ```ts
 * import { debug } from "@liqvid/cli/debug";
 *
 * await debug({ url: "http://localhost:3000/projects/my-video" });
 * ```
 */
export async function debug(options: DebugOptions): Promise<void> {
  const { debug: openDebug } = await import("@liqvid/renderer/debug");

  await openDebug({
    browserExecutable: options.browserExecutable ?? "",
    url: options.url,
  });
}

/** Open a URL in a visible browser for debugging. */
export const debugCommand: CommandModule = {
  builder: (yargs) =>
    yargs
      .config("config", parseConfig("debug"))
      .default("config", DEFAULT_CONFIG)
      .example([["liqvid debug -u http://localhost:3000"]])
      // Selection
      .group(["url"], "What to open")
      .option("url", {
        alias: "u",
        demandOption: true,
        desc: "URL to open",
        type: "string",
      })
      // General configuration
      .group(["browser-executable", "config", "help"], "General options")
      .option("browser-executable", BROWSER_EXECUTABLE)
      .version(false),
  command: "debug",
  describe: "Open a URL in a visible browser for debugging",
  handler: async (argv) => {
    const { debug: openDebug } = await import("@liqvid/renderer/debug");
    await openDebug({
      browserExecutable: (argv.browserExecutable as string) ?? "",
      url: argv.url as string,
    });
    process.exit(0);
  },
};
