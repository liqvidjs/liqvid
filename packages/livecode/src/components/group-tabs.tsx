import { onClickReact } from "@liqvid/utils";
import { useMemo } from "react";
import { useStore } from "zustand";

import { ids } from "../ids.ts";
import { useLiveCodeStore } from "../store.ts";

/** Group selection tab. */
export function Tab({
  id,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** ID of {@link EditorGroup} this corresponds to */
  id: string;
}) {
  const store = useLiveCodeStore();
  const active = useStore(store, (state) => state.activeGroup === id);

  const events = useMemo(
    () =>
      onClickReact(() => {
        store.setState({ activeGroup: id });
      }),
    [id, store.setState],
  );

  return (
    <button
      aria-controls={ids.editorGroup({ group: id })}
      aria-selected={active}
      id={ids.groupTab({ group: id })}
      role="tab"
      type="button"
      {...events}
      {...props}
    />
  );
}

/** Holds a list of {@link Tab}s. */
export function TabList(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" {...props} />;
}
