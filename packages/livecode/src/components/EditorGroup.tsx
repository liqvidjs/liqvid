import { filterRecord } from "@liqvid/utils";
import clsx from "clsx";
import { useEffect } from "react";
import { useStore } from "zustand";

import { ids } from "../ids.ts";
import { useLiveCodeStore } from "../store.ts";

import { GroupProvider } from "./context.tsx";

/** Holds a group of editors. */
export function EditorGroup({
  children,
  className,
  name,
  ...attrs
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Name of this group. */
  name: string;
}) {
  const store = useLiveCodeStore();
  const active = useStore(store, (state) => state.activeGroup === name);

  useEffect(() => {
    const state = store.getState();
    if (!state.activeGroup) {
      store.setState({ activeGroup: name });
    }

    return () => {
      store.setState((prev) => {
        const newGroups = filterRecord(prev.groups, (_, key) => key !== name);
        return {
          ...prev,
          activeGroup:
            prev.activeGroup === name
              ? Object.keys(newGroups)[0]
              : prev.activeGroup,
          groups: newGroups,
        };
      });
    };
  }, [name, store]);

  return (
    <div
      aria-labelledby={ids.groupTab({ group: name })}
      className={clsx("lqv-editor-group", className)}
      hidden={!active}
      id={ids.editorGroup({ group: name })}
      role="tabpanel"
      {...attrs}
    >
      <GroupProvider value={name}>{children}</GroupProvider>
    </div>
  );
}
