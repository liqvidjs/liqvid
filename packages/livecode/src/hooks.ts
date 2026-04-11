"use client";

import { EditorSelection, type SelectionRange } from "@codemirror/state";
import type { Command, EditorView } from "@codemirror/view";
import { Duration, type DurationLike } from "@liqvid/duration";
import { filterRecord } from "@liqvid/utils";
import { lv2cm } from "@lqv/codemirror/extensions";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { useLiveCodeStore } from "./store";
import { download, getFileType, viewContents } from "./utils";

/** subscribe to the active file */
export function useActiveFile() {
  return useStore(
    useLiveCodeStore(),
    useShallow((state) => {
      const { activeGroup, groups } = state;
      if (!activeGroup) return null;

      // TODO: this is inefficient
      const group = groups[activeGroup];
      return group.files.find((f) => f.filename === group.activeFile);
    }),
  );
}

/** download all the files in the active group as a .zip */
export function useDownloadAll(
  /**
   * filename for the .zip file
   * @default example.zip
   */
  filename = "example.zip",
) {
  const store = useLiveCodeStore();

  return useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const { activeGroup, groups } = store.getState();

    if (!activeGroup) {
      console.warn("no active group");
      return;
    }

    for (const { filename, view } of groups[activeGroup].files) {
      zip.file(filename, viewContents(view));
    }

    const content = await zip.generateAsync({ type: "blob" });

    download({ content, filename });
  }, [filename, store]);
}

/** Hook to copy the active file */
export function useCopyActiveFile({
  timeout = 1000,
}: {
  /** how long to show the "copied" state after copying, in milliseconds or a Duration */
  timeout?: number | DurationLike;
} = {}) {
  const store = useLiveCodeStore();
  const [isCopied, setIsCopied] = useState(false);
  const copyTimeout = useRef<number | undefined>(undefined);

  if (typeof timeout !== "number") {
    timeout = Duration.from(timeout).inMilliseconds();
  }

  const copyActiveFile = useCallback(async () => {
    const { view } = store.getState().getActiveFile();

    // copy text
    await navigator.clipboard.writeText(viewContents(view));

    // update state
    setIsCopied(true);
    copyTimeout.current = window.setTimeout(() => {
      setIsCopied(false);
    }, timeout);
  }, [store.getState, timeout]);

  // clear timeout when component is unmounted
  useEffect(() => () => window.clearTimeout(copyTimeout.current), []);

  return { copyActiveFile, isCopied };
}

/**
 * Download the content of the active file.
 */
export function useDownloadCurrent() {
  const store = useLiveCodeStore();
  return useCallback(() => {
    const { filename, view } = store.getState().getActiveFile();

    download({
      content: viewContents(view),
      filename,
      mime: getMimeType(getFileType(filename)),
    });
  }, [store]);
}

/** guess the MIME type of a file from its extension */
export function getMimeType(extension: string) {
  switch (extension) {
    case "c":
    case "cpp":
      return "text/x-c";
    case "css":
      return "text/css";
    case "html":
      return "text/html";
    case "java":
      return "text/x-java";
    case "js":
    case "jsx":
      return "text/javascript";
    case "md":
      return "text/markdown";
    case "py":
      return "text/x-python";
    case "rs":
      return "text/rust";
    case "sql":
      return "text/sql";
    case "ts":
    case "tsx":
      return "text/javascript";
    case "xml":
      return "application/xml";
    default:
      return "text/plain";
  }
}

/** add a keyboard shortcut */
export function useLiveCodeShortcut(
  shortcut: string | undefined,
  action: Command,
) {
  const { setState: setStoreState } = useLiveCodeStore();

  useEffect(() => {
    if (!shortcut) return;

    setStoreState((prev) => ({
      shortcuts: {
        ...prev.shortcuts,
        [shortcut]: {
          key: lv2cm(shortcut),
          run: action,
        },
      },
    }));

    return () => {
      setStoreState((prev) => ({
        shortcuts: filterRecord(prev.shortcuts, (_, key) => key !== shortcut),
      }));
    };
  }, [shortcut, setStoreState, action]);
}

/**
 * Format the active file using Prettier.
 * Prettier is dynamically imported so it's only loaded when this hook is used.
 */
export function useFormatActiveFile() {
  const store = useLiveCodeStore();

  return useCallback(async () => {
    const { filename, view } = store.getState().getActiveFile();
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
      case "js": {
        const babelPlugin = await import("prettier/plugins/babel");
        const estreePlugin = await import("prettier/plugins/estree");
        formatter = (code) =>
          prettier.format(code, {
            filepath: filename,
            plugins: [estreePlugin.default, babelPlugin.default],
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

/** Preserve selection when formatting with Prettier */
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
    if (pretty[newPos].match(aestheticChars)) {
      continue;
    }

    i++;
  }

  return newPos;
}
