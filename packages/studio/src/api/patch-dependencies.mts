import path from "node:path";

import { Effect, FileSystem } from "effect";

export function patchDependencies() {
  return Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    const NODEJS_WHISPER = path.join(".", "node_modules", "nodejs-whisper");
    const SHELL_JS = path.join(NODEJS_WHISPER, "node_modules", "shelljs");

    const patched: string[] = [];

    /* ------------------------------ nodejs-whisper/dist/constants.js ------------------------------ */
    const CONSTANTS_JS = path.join(NODEJS_WHISPER, "dist", "constants.js");
    let constantsJs = yield* fs.readFileString(CONSTANTS_JS);

    if (constantsJs.includes("__dirname")) {
      constantsJs = constantsJs.replace(
        /__dirname/g,
        `path_1.default.dirname(require("url").fileURLToPath(import.meta.url))`,
      );
      patched.push(CONSTANTS_JS);

      yield* fs.writeFileString(CONSTANTS_JS, constantsJs);
    }

    /* ------------------------------ shelljs/src/exec.js ------------------------------ */
    const EXEC_JS = path.join(SHELL_JS, "src", "exec.js");

    // https://github.com/shelljs/shelljs/commit/f364da6625945414440bb15210f102ba5fc10ed9
    let execJs = yield* fs.readFileString(EXEC_JS);
    if (!execJs.includes("EXEC_CHILD_PATH")) {
      execJs = execJs.replace(
        "var DEFAULT_MAXBUFFER_SIZE =",
        `// Resolve exec-child.js path at module load time using require.resolve() so that
// bundlers (e.g. Next.js/webpack) do not break the path by replacing __dirname
// with the bundled output directory. require.resolve() always returns the real
// filesystem path of the module, regardless of bundler transformations.
var EXEC_CHILD_PATH = require.resolve('./exec-child.js');

var DEFAULT_MAXBUFFER_SIZE =`,
      );

      execJs = execJs.replace(
        `path.join(__dirname, 'exec-child.js')`,
        "EXEC_CHILD_PATH",
      );

      yield* fs.writeFileString(EXEC_JS, execJs);

      patched.push(EXEC_JS);
    }

    return patched;
  });
}
