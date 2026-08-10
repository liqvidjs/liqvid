import { useCallback, useMemo } from "react";

import { useLiveCodeStore } from "../../store.ts";
import { getFileType } from "../../utils.ts";

import type { JavaScriptishExtension } from "./types.ts";

/** Transpile code using Babel .*/
export function useTranspile(
  /** provide a Babel instance */
  Babel: typeof import("@babel/standalone"),
): (
  /** name of file to transform */
  filename: string,

  /** code to transform */
  code: string,
) => string {
  return useCallback(
    (filename: string, code: string) => {
      const extn = getFileType(filename) as JavaScriptishExtension;

      if (extn === "js" || extn === "mjs") return code;

      // plugins and presets for different filetypes
      const globals = {};
      const reactGlobals = {
        react: "React",
        "react-dom": "ReactDOM",
      };

      const presets: babel.PluginItem[] = [["env", { modules: false }]];

      switch (extn) {
        case "jsx":
          presets.push("react");
          Object.assign(globals, reactGlobals);
          break;
        case "ts":
        case "mts":
          presets.push("typescript");
          break;
        case "tsx":
          Object.assign(globals, reactGlobals);
          presets.push("react", "typescript");
          break;
      }

      // babel transform
      const opts: babel.TransformOptions = {
        filename,
        // plugins: [["transform-modules-umd", { globals }]],
        presets,
      };

      try {
        const transformed = Babel.transform(code, opts).code;
        if (typeof transformed === "string") return transformed;
        throw new Error("Babel transformation failed");
      } catch (cause) {
        throw new Error(`Babel transformation failed`, { cause });
      }
    },
    [Babel],
  );
}

/** get access to virtual console which writes to the LiveCode messages */
export function useVirtualConsole(): Pick<
  Console,
  "debug" | "error" | "info" | "log" | "warn"
> {
  const store = useLiveCodeStore();

  /** console.{log, error, info, warn, ...} */
  const categorizedLog = useCallback(
    (kind: string, ...args: unknown[]) => {
      store.setState((prev) => ({
        messages: [
          ...prev.messages,
          {
            data: args,
            kind,
            timestamp: new Date(),
          },
        ],
      }));
    },
    [store],
  );

  return useMemo(
    () => ({
      debug: (...args: unknown[]) => categorizedLog("debug", ...args),
      error: (...args: unknown[]) => categorizedLog("error", ...args),
      info: (...args: unknown[]) => categorizedLog("info", ...args),
      log: (...args: unknown[]) => categorizedLog("log", ...args),
      warn: (...args: unknown[]) => categorizedLog("warn", ...args),
    }),
    [categorizedLog],
  );
}
