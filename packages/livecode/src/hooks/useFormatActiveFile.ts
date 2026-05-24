import { EditorSelection, type SelectionRange } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { useCallback } from "react";

import { selectActiveFile } from "../selectors.ts";
import { useLiveCodeStore } from "../store.ts";
import { getFileType, viewContents } from "../utils.ts";

/**
 * Format the active file using Prettier.
 * Prettier is dynamically imported so it's only loaded when this hook is used.
 */
export function useFormatActiveFile() {
  const store = useLiveCodeStore();

  return useCallback(async () => {
    // extract state
    const active = selectActiveFile(store.getState());
    if (!active) return;
    const { filename, view } = active;

    // get file type
    const extn = getFileType(filename);

    // Dynamically import prettier and plugins
    const prettier = await import("prettier");

    let formatter: Formatter;
    switch (extn) {
      case "css": {
        const cssPlugin = await import("prettier/plugins/postcss");
        formatter = (code) =>
          prettier.format(code, {
            filepath: filename,
            parser: "css",
            plugins: [cssPlugin.default],
          });
        break;
      }
      case "html": {
        const htmlPlugin = await import("prettier/plugins/html");
        formatter = (code) =>
          prettier.format(code, {
            filepath: filename,
            parser: "html",
            plugins: [htmlPlugin.default],
          });
        break;
      }
      case "js":
      case "jsx": {
        const babelPlugin = await import("prettier/plugins/babel");
        const estreePlugin = await import("prettier/plugins/estree");
        formatter = (code) =>
          prettier.format(code, {
            filepath: filename,
            plugins: [estreePlugin.default, babelPlugin.default],
          });
        break;
      }

      case "ts":
      case "tsx": {
        const estreePlugin = await import("prettier/plugins/estree");
        const typescriptPlugin = await import("prettier/plugins/typescript");
        formatter = (code) =>
          prettier.format(code, {
            filepath: filename,
            plugins: [estreePlugin.default, typescriptPlugin.default],
          });
        break;
      }
      default:
        formatter = Promise.resolve;
    }

    formatView(view, formatter);
  }, [store.getState]);
}

type Formatter = (code: string) => Promise<string>;

async function formatView(view: EditorView, formatter: Formatter) {
  const unformatted = viewContents(view);

  try {
    const formatted = await formatter(unformatted);

    const newSelection = preserveSelection(
      view.state.selection.main,
      unformatted,
      formatted,
    );

    view.dispatch(
      view.state.update({
        changes: {
          from: 0,
          insert: formatted,
          to: view.state.doc.length,
        },
        selection: newSelection,
      }),
    );
  } catch (e) {
    console.error(e);
  }
}

/** Characters that get inserted by Prettier */
const aestheticChars = /[\s(),;]/g;

/**
 * Preserve selection when formatting with Prettier
 * TODO: there is an actual API for doing this
 */
function preserveSelection(
  selection: SelectionRange,
  unformatted: string,
  formatted: string,
): EditorSelection {
  return EditorSelection.single(
    offset(selection.anchor, unformatted, formatted),
    offset(selection.head, unformatted, formatted),
  );
}

/** Guess the cursor offset in text after applying formatting */
function offset(pos: number, ugly: string, pretty: string): number {
  let newPos = 0;

  const normalized = ugly.slice(0, pos).replace(/[\s(),]/g, "");

  for (let i = 0; i < normalized.length && newPos < pretty.length; ++newPos) {
    if (pretty[newPos]!.match(aestheticChars)) {
      continue;
    }

    i++;
  }

  return newPos;
}
