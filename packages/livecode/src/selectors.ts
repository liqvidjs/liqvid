import type { EditorView } from "@codemirror/view";

import type { LiveCodeFile, LiveCodeGroup, LiveCodeState } from "./store.ts";

/** Select the active file. */
export function selectActiveFile(
  state: LiveCodeState,
): LiveCodeFile | undefined {
  const group = selectActiveGroup(state);
  return group?.files?.find((_) => _.filename === group.activeFile);
}

/** Select the active group. */
export function selectActiveGroup(
  state: LiveCodeState,
): LiveCodeGroup | undefined {
  const { groups, activeGroup } = state;
  if (!activeGroup) return undefined;
  return groups[activeGroup];
}

/** Select the active view. */
export function selectActiveView(state: LiveCodeState): EditorView | undefined {
  return selectActiveFile(state)?.view;
}
