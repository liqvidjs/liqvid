import * as fs from "node:fs";
import * as path from "node:path";

import { execa } from "execa";
import type { CommandModule } from "yargs";

const ERROR_LOG_PATH = path.join(process.cwd(), "logs/build-errors.log");

function getErrorLogStream(): fs.WriteStream {
  const logsDir = path.dirname(ERROR_LOG_PATH);
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return fs.createWriteStream(ERROR_LOG_PATH, { flags: "a" });
}

/**
 * Build project
 */
export const build: CommandModule = {
  builder: (yargs) =>
    yargs.option("cwd", {
      alias: "C",
      coerce: path.resolve,
      default: process.cwd(),
      desc: "Working directory",
    }),
  command: "build",
  describe: "Build project",
  handler: async (args) => {
    await runNextBuild({ cwd: args.cwd as string });
  },
};

export interface BuildOptions {
  /** Working directory */
  cwd?: string;
}

/**
 * Run Next.js build
 */
export async function runNextBuild(options: BuildOptions = {}): Promise<void> {
  const cwd = options.cwd ?? process.cwd();

  console.log("Running 'next build'...");
  const errorLogStream = getErrorLogStream();

  const buildProcess = execa("npx", ["next", "build"], {
    cwd,
    env: { ...process.env, NODE_ENV: "production" },
    stderr: "pipe",
    stdout: "inherit",
  });
  buildProcess.stderr?.pipe(errorLogStream, { end: false });
  await buildProcess;
  console.log("'next build' completed.");
}
