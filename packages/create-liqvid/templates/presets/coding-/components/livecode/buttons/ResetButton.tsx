import { useLiveCodeStore } from "@lqv/livecode";
import { EraserIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand/react";

import { buttonStyles } from "./styles.tsx";

export function ResetButton({ shortcut }: { shortcut?: string }) {
  const store = useLiveCodeStore();
  const contents = useRef<Record<string, Record<string, string>>>({});
  const groups = useStore(store, (state) => state.groups);

  /* get contents */
  useEffect(() => {
    if (Object.keys(contents.current).length > 0) return;
    for (const key in groups) {
      contents.current[key] = {};
      for (const file of groups[key].files) {
        contents.current[key][file.filename] = file.view.state.doc.toString();
      }
    }
  }, [groups]);

  /* reset */
  const reset = useCallback(() => {
    const state = store.getState();
    for (const groupName in contents.current) {
      for (const { filename, view } of state.groups[groupName].files) {
        if (filename in contents.current[groupName]) {
          view.dispatch(
            view.state.update({
              changes: {
                from: 0,
                insert: contents.current[groupName][filename],
                to: view.state.doc.length,
              },
            }),
          );
        }
      }
    }
  }, [store]);

  return (
    <button
      className={buttonStyles}
      onClick={reset}
      title="Reset"
      type="button"
    >
      <EraserIcon />
    </button>
  );
}
