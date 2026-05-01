import { onClickReact } from "@liqvid/utils";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useLiveCodeStore } from "../store.ts";

/** Button for resetting editor contents to initial state. */
export function Reset({
  className,
  ...attrs
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const store = useLiveCodeStore();
  const contents = useRef<Record<string, Record<string, string>>>({});

  /* get contents */
  useEffect(() => {
    const state = store.getState();
    for (const key in state.groups) {
      contents.current[key] = {};
      for (const file of state.groups[key].files) {
        contents.current[key][file.filename] = file.view.state.doc.toString();
      }
    }
  }, [store]);

  /* reset */
  const reset = useCallback(() => {
    const state = store.getState();
    for (const groupName in contents.current) {
      for (const file of state.groups[groupName].files) {
        if (file.filename in contents.current[groupName]) {
          file.view.dispatch(
            file.view.state.update({
              changes: {
                from: 0,
                insert: contents.current[groupName][file.filename],
                to: file.view.state.doc.length,
              },
            }),
          );
        }
      }
    }
  }, [store]);

  const resetEvents = useMemo(() => onClickReact(reset), [reset]);

  return (
    <button
      className={clsx("lqv-cb-reset", className)}
      {...resetEvents}
      {...attrs}
    />
  );
}
