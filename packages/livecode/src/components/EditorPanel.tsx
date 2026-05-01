import clsx from "clsx";
import { useStore } from "zustand";

import { ids } from "../ids.ts";
import { useLiveCodeStore } from "../store.ts";

import { FilenameProvider, useGroup } from "./context.tsx";

/**
 * Tabpanel containing a single editor.
 */
export function EditorPanel({
  children,
  className,
  filename,
  group,
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
  const contextGroup = useGroup() ?? "default";
  group ??= contextGroup;

  const store = useLiveCodeStore();
  const active = useStore(
    store,
    (state) => state.groups[group]?.activeFile === filename,
  );

  return (
    <div
      aria-labelledby={ids.fileTab({ filename, group })}
      className={clsx("lqv-editor-panel", className)}
      hidden={!active}
      id={ids.editorPanel({ filename, group })}
      role="tabpanel"
      {...props}
    >
      <FilenameProvider value={filename}>{children}</FilenameProvider>
    </div>
  );
}
