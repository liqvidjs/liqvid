import classNames from "classnames";
import { Children, cloneElement } from "react";
import { useStore } from "zustand";

import { useBoothStore } from "../store";
import { ids } from "../utils";

/**
 * Tabpanel containing a single editor.
 */
export function EditorPanel({
  children,
  className,
  filename,
  group = "default",
  ...props
}: {
  className?: string;

  children?: React.ReactNode;

  /** Filename for the panel. */
  filename: string;

  /**
   * Group name for the panel.
   * @default "default"
   */
  group?: string;
}) {
  const store = useBoothStore();
  const active = useStore(
    store,
    (state) => state.groups[group]?.activeFile === filename,
  );

  return (
    <div
      aria-expanded={active}
      aria-labelledby={ids.fileTab({ filename, group })}
      className={classNames("lqv-editor-panel", className)}
      hidden={!active}
      id={ids.editorPanel({ filename, group })}
      role="tabpanel"
      {...props}
    >
      {Children.map(children, (node) => {
        if (typeof node === "object" && node !== null && "props" in node) {
          return cloneElement(node, { filename, group });
        }
        return node;
      })}
    </div>
  );
}
