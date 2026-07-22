"use client";

import * as Babel from "@babel/standalone";
import {
  getFileType,
  selectActiveFile,
  selectActiveGroup,
  useLiveCodeStore,
  useOnRun,
  viewContents,
} from "@lqv/livecode";
import { lazy, useCallback, useState } from "react";

export type JavaScriptishExtension =
  | "js"
  | "jsx"
  | "mjs"
  | "mts"
  | "ts"
  | "tsx";

/**
 * Run TypeScript code in a sandboxed environment.
 *
 * Requires `sval` to be installed as a peer dependency.
 */
export const RunTypeScript = lazy(() =>
  import("sval").then(({ default: Sval }) => ({
    default: function RunTypeScript({
      main,
    }: {
      /**
       * Filename of the main entry point.
       * If not provided, the active file will be used.
       */
      main?: string;
    }) {
      const store = useLiveCodeStore();

      /** console.{log, error, info, warn, ...} */
      const categorizedLog = (kind: string, ...args: unknown[]) => {
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
      };

      // create interpreter and shim the log function
      const [interpreter] = useState(() => {
        const interpreter = new Sval({
          ecmaVer: "latest",
          sandBox: true,
          sourceType: "script",
        });

        interpreter.import("console", {
          debug: (...args: unknown[]) => categorizedLog("debug", ...args),
          error: (...args: unknown[]) => categorizedLog("error", ...args),
          info: (...args: unknown[]) => categorizedLog("info", ...args),
          log: (...args: unknown[]) => categorizedLog("log", ...args),
          warn: (...args: unknown[]) => categorizedLog("warn", ...args),
        });

        return interpreter;
      });

      // hook into run event
      useOnRun(
        useCallback(() => {
          const state = store.getState();
          const file = main
            ? selectActiveGroup(state)?.files.find(
                ({ filename }) => filename === main,
              )
            : selectActiveFile(state);
          if (!file) return;

          // compile typescript to JS
          let code = viewContents(file.view);

          // presets for different filetypes
          const presets = ["env"];
          const extn = getFileType(file.filename) as JavaScriptishExtension;

          switch (extn) {
            case "jsx":
              presets.push("react");
              break;
            case "ts":
              presets.push("typescript");
              break;
            case "tsx":
              presets.push("react", "typescript");
              break;
          }

          // babel transform
          // biome-ignore lint/suspicious/noExplicitAny: types are not available?
          const opts: any = {
            filename: "index.tsx",
            plugins: [
              [
                "transform-modules-umd",
                {
                  globals: {
                    react: "React",
                    "react-dom": "ReactDOM",
                  },
                },
              ],
            ],
            presets: ["env", "react", "typescript"],
          };
          try {
            code = Babel.transform(code, opts).code;
            interpreter.run(code);
          } catch (e) {
            console.error(e);
          }
        }, [interpreter, store, main]),
      );

      return null;
    },
  })),
);
