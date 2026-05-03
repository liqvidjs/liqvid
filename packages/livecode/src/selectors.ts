import type { LiveCodeState } from "./store.ts";

/** Get the active file. */
export function selectActiveFile(state: LiveCodeState) {
  const group = selectActiveGroup(state);
  return group?.files?.find((_) => _.filename === group.activeFile);
}

/** Get the active group. */
export function selectActiveGroup(state: LiveCodeState) {
  const { groups, activeGroup } = state;
  if (!activeGroup) return undefined;
  return groups[activeGroup];
}

/** Get the active view. */
export function selectActiveView(state: LiveCodeState) {
  return selectActiveFile(state)?.view;
}
