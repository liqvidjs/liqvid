import classNames from "classnames";
import { Children, cloneElement, useEffect } from "react";
import { useStore } from "zustand";

import { ids } from "../ids";
import { useBoothStore } from "../store";

/** Holds a group of editors. */
export function EditorGroup({
  children,
  className,
  id,
  ...attrs
}: React.HTMLAttributes<HTMLDivElement> & {
  /** ID of this group. */
  id: string;
}) {
  const store = useBoothStore();
  const active = useStore(store, (state) => state.activeGroup === id);

  useEffect(() => {
    const state = store.getState();
    if (!state.activeGroup) {
      store.setState({ activeGroup: id });
    }

    return () => {
      store.setState((prev) => {
        const newGroups = Object.fromEntries(
          Object.entries(prev.groups).filter(([key]) => key !== id),
        );
        return {
          ...prev,
          activeGroup:
            prev.activeGroup === id
              ? Object.keys(newGroups)[0]
              : prev.activeGroup,
          groups: newGroups,
        };
      });
    };
  }, [id, store]);

  return (
    <div
      aria-expanded={active}
      aria-labelledby={ids.groupTab({ group: id })}
      className={classNames("lqv-editor-group", className)}
      hidden={!active}
      id={ids.editorGroup({ group: id })}
      role="tabpanel"
      {...attrs}
    >
      {Children.map(children, (node) => {
        if (typeof node === "object" && node !== null && "props" in node) {
          return cloneElement(node, { group: id });
        }
        return node;
      })}
    </div>
  );
}
