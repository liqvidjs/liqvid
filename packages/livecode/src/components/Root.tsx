"use client";

import { keymap } from "@codemirror/view";
import { PlaybackContext, useME } from "@lqv/playback/react";
import classNames from "classnames";
import { type JSX, useEffect, useRef } from "react";
import { useStore } from "zustand";

import { shortcuts } from "../extensions";
import { BoothStore, makeStore, type Store, useBoothStore } from "../store";

/**
 * Container for code editing/recording/replaying.
 */

export function LiveCode({
  children,
  className,
  ...attrs
}: JSX.IntrinsicElements["div"]) {
  const store = useRef<Store>(null);
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
      <BoothStore.Provider value={store.current}>
        <PlaybackContext.Provider value={useME()}>
          <KeyboardShortcuts />
          {children}
        </PlaybackContext.Provider>
      </BoothStore.Provider>
    </div>
  );
}

export function KeyboardShortcuts(): null {
  const store = useBoothStore();

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
