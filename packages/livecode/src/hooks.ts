"use client";

import type { Extension } from "@codemirror/state";
import type { Command, EditorView } from "@codemirror/view";
import { useColorScheme } from "@liqvid/color-scheme/react";
import { Duration, type DurationLike } from "@liqvid/duration";
import { filterRecord } from "@liqvid/utils";
import { lv2cm } from "@lqv/codemirror/extensions";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/shallow";

import { getReadViewPlugin, lightDarkCompartment } from "./extensions.ts";
import { useLiveCodeStore } from "./store.ts";
import { viewContents } from "./utils.ts";

export * from "./hooks/downloading.ts";
export * from "./hooks/messages.ts";
export * from "./hooks/useFormatActiveFile.ts";

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
    const view = store.getState().getActiveFile()?.view;
    if (!view) return;

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

/** hook to apply extensions based on the current color scheme */
export function useLightDarkExtensions(extensions: {
  /** extensions to apply in light mode */
  light: Extension[];

  /** extensions to apply in dark mode */
  dark: Extension[];
}) {
  const { colorScheme } = useColorScheme();

  const [view, setView] = useState<EditorView | null>(null);
  const [readViewPlugin] = useState(() => getReadViewPlugin(setView));

  // don't do `extensions[colorScheme]` because wrecks React dependency array stability
  const relevantExtensions =
    colorScheme === "dark" ? extensions.dark : extensions.light;

  useEffect(() => {
    view?.dispatch({
      effects: lightDarkCompartment.reconfigure([relevantExtensions]),
    });
  }, [view, relevantExtensions]);

  return useMemo(
    () => [readViewPlugin, lightDarkCompartment.of(relevantExtensions)],
    [readViewPlugin, relevantExtensions],
  );
}

/** add a keyboard shortcut */
export function useLiveCodeShortcut(
  /** keyboard shortcut to add */
  shortcut: string | undefined,

  /** command to run when the shortcut is triggered */
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

/** subscribe to the run event */
export function useOnRun(
  /** callback to be called when the run event is triggered */
  callback: () => void,
) {
  const store = useLiveCodeStore();

  useEffect(
    () =>
      store.subscribe(
        (state) => state.__run,
        () => {
          callback();
        },
      ),
    [store, callback],
  );
}

/** get a callback to run the code */
export function useRun() {
  const { setState } = useLiveCodeStore();

  // run callback
  return useCallback(() => {
    setState((prev) => ({ __run: prev.__run + 1 }));
  }, [setState]);
}
