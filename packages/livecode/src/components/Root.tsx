"use client";

import { type EditorView, keymap } from "@codemirror/view";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import type { CleanUpFn } from "@liqvid/utils";
import type { CodeMirrorInstance } from "@lqv/codemirror/recording";
import clsx from "clsx";
import { type JSX, useEffect, useState } from "react";
import { useStore } from "zustand";

import { shortcuts } from "../extensions.ts";
import {
  LiveCodeContext,
  type LiveCodeStore,
  makeStore,
  useLiveCodeStore,
} from "../store.ts";

/**
 * Container for code editing/recording/replaying.
 */
export function LiveCode({
  children,
  className,
  name,
  ...attrs
}: JSX.IntrinsicElements["div"] & {
  /** Name for this LiveCode instance. Used to distinguish multiple instances in the Recording dialog. */
  name?: string;
}) {
  const { registerInstance } = usePluginApi();

  const [store] = useState(() => makeStore());

  useEffect(() => {
    return registerInstance<CodeMirrorInstance>("@lqv/codemirror", {
      name,
      provideRecorder(recorder) {
        store.setState((prev) => ({ ...prev, recorder }));
        recorder?.configure({
          getActiveFile() {
            const { activeGroup, groups } = store.getState();
            if (!activeGroup) {
              return undefined;
            }

            return groups[activeGroup]?.activeFile;
          },
          views: new Proxy(store, storeProxyHandler) as unknown as Record<
            string,
            EditorView
          >,
        });
      },
    });
  }, [name, registerInstance, store]);

  const stateClassNames = useStore(store, (state) => state.classNames);

  /* render */
  return (
    <div
      className={clsx("lqv-livecode", stateClassNames, className)}
      data-affords="click keys"
      {...attrs}
    >
      <LiveCodeContext.Provider value={store}>
        <KeyboardShortcuts />
        {children}
      </LiveCodeContext.Provider>
    </div>
  );
}

export function KeyboardShortcuts(): null {
  const store = useLiveCodeStore();

  useEffect(() => {
    // this is somewhat wasteful but oh well
    function reconfigure(): void {
      const state = store.getState();

      for (const group of Object.values(state.groups)) {
        for (const { view } of group.files) {
          view.dispatch({
            effects: shortcuts.reconfigure([
              keymap.of(Object.values(state.shortcuts)),
            ]),
          });
        }
      }
    }

    const unsubs: CleanUpFn[] = [];

    // update with new shortcuts
    unsubs.push(store.subscribe((state) => state.shortcuts, reconfigure));

    // update with new editors
    unsubs.push(store.subscribe((state) => state.groups, reconfigure));

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [store]);

  return null;
}

const storeProxyHandler: ProxyHandler<LiveCodeStore> = {
  get(store, prop) {
    switch (prop) {
      case "toJSON":
      case "length":
        return null;
      default: {
        const { activeGroup, groups } = store.getState();
        if (!activeGroup || !groups[activeGroup]) {
          return null;
        }

        return groups[activeGroup].files.find(
          ({ filename }) => filename === prop,
        )?.view;
      }
    }
  },
  getOwnPropertyDescriptor() {
    return {
      configurable: true,
      enumerable: true,
      writable: false,
    };
  },
  ownKeys(target) {
    const { activeGroup, groups } = target.getState();
    if (!activeGroup || !groups[activeGroup]) {
      return [];
    }

    return groups[activeGroup].files.map(({ filename }) => filename);
  },
};
