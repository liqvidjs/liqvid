import { EditorSelection, type SelectionRange } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import type { Awaitable } from "@liqvid/utils";
import type * as prettier from "prettier";
import { useCallback } from "react";
import type { SetOptional } from "type-fest";

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

    let supportsCursorPreservation = true;

    let options: SetOptional<prettier.CursorOptions, "cursorOffset">;
    switch (extn) {
      case "css": {
        const cssPlugin = await import("prettier/plugins/postcss");
        options = {
          filepath: filename,
          parser: "css",
          plugins: [cssPlugin.default],
        };
        break;
      }
      case "glsl": {
        // https://github.com/NaridaL/glsl-language-toolkit/issues/47
        supportsCursorPreservation = false;
        const glslPlugin = await import("prettier-plugin-glsl");
        options = {
          filepath: filename,
          plugins: [glslPlugin],
        };
        break;
      }
      case "html": {
        const htmlPlugin = await import("prettier/plugins/html");
        options = {
          filepath: filename,
          parser: "html",
          plugins: [htmlPlugin.default],
        };
        break;
      }
      case "js":
      case "jsx": {
        const babelPlugin = await import("prettier/plugins/babel");
        const estreePlugin = await import("prettier/plugins/estree");
        options = {
          filepath: filename,
          plugins: [estreePlugin.default, babelPlugin.default],
        };
        break;
      }

      case "ts":
      case "tsx": {
        const estreePlugin = await import("prettier/plugins/estree");
        const typescriptPlugin = await import("prettier/plugins/typescript");
        options = {
          filepath: filename,
          plugins: [estreePlugin.default, typescriptPlugin.default],
        };
        break;
      }
      default:
        return;
    }

    if (supportsCursorPreservation) {
      formatViewWithCursor(view, (code, cursorOffset) =>
        prettier.formatWithCursor(code, { ...options, cursorOffset }),
      );
    } else {
      // Some plugins (e.g. prettier-plugin-glsl) don't support the cursor API,
      // so fall back to guessing the new cursor position.
      formatViewGuessCursor(view, (code) => prettier.format(code, options));
    }
  }, [store.getState]);
}

/** Apply formatted text and selection to the view. */
function applyFormatting(
  view: EditorView,
  formatted: string,
  selection: EditorSelection,
) {
  view.dispatch(
    view.state.update({
      changes: {
        from: 0,
        insert: formatted,
        to: view.state.doc.length,
      },
      selection,
    }),
  );
}

type CursorFormatter = (
  code: string,
  cursorOffset: number,
) => Promise<prettier.CursorResult>;

/** Format using Prettier's official cursor-preservation API. */
async function formatViewWithCursor(
  view: EditorView,
  formatter: CursorFormatter,
) {
  const unformatted = viewContents(view);
  const { anchor, head } = view.state.selection.main;

  try {
    // formatWithCursor tracks a single cursor, so format once per selection
    // endpoint (reusing the result when the selection is empty).
    const anchorResult = await formatter(unformatted, anchor);
    const headResult =
      anchor === head ? anchorResult : await formatter(unformatted, head);

    applyFormatting(
      view,
      anchorResult.formatted,
      EditorSelection.single(
        anchorResult.cursorOffset,
        headResult.cursorOffset,
      ),
    );
  } catch (e) {
    console.error(e);
  }
}

type Formatter = (code: string) => Awaitable<string>;

/** Format then guess the new cursor position (for plugins lacking the API). */
async function formatViewGuessCursor(view: EditorView, formatter: Formatter) {
  const unformatted = viewContents(view);

  try {
    const formatted = await formatter(unformatted);

    applyFormatting(
      view,
      formatted,
      preserveSelection(view.state.selection.main, unformatted, formatted),
    );
  } catch (e) {
    console.error(e);
  }
}

/** Characters that get inserted by Prettier */
const aestheticChars = /[\s(),;]/g;

/**
 * Preserve selection when formatting with Prettier.
 *
 * Prettier's `formatWithCursor` is the proper way to do this, but some plugins
 * (e.g. prettier-plugin-glsl) don't support it, so this guesses instead.
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
