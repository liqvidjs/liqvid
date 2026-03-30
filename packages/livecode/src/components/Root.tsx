"use client";

import { keymap } from "@codemirror/view";
import { usePluginApi } from "@liqvid/studio-plugin-api";
import type { CodeMirrorInstance } from "@lqv/codemirror/recording";
import classNames from "classnames";
import { type JSX, useEffect, useRef } from "react";
import { useStore } from "zustand";

import { shortcuts } from "../extensions";
import {
  LiveCodeContext,
  type LiveCodeStore,
  makeStore,
  useLiveCodeStore,
} from "../store";

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

  useEffect(() => {
    return registerInstance<CodeMirrorInstance>("@lqv/codemirror", {
      name,
      provideRecorder(recorder) {
        store.current?.setState((prev) => ({ ...prev, recorder }));
      },
    });
  }, [name, registerInstance]);

  const store = useRef<LiveCodeStore>(null);
  if (!store.current) {
    store.current = makeStore();
  }
  const stateClassNames = useStore(store.current, (state) => state.classNames);

  /* render */
  return (
    <div
      className={classNames(stateClassNames, className)}
      data-affords="click keys"
      {...attrs}
    >
      <LiveCodeContext.Provider value={store.current}>
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

      for (const groupName in state.groups) {
        for (const { view } of state.groups[groupName].files) {
          view.dispatch({
            effects: shortcuts.reconfigure([
              keymap.of(Object.values(state.shortcuts)),
            ]),
          });
        }
      }
    }

    const unsubs: (() => void)[] = [];

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
