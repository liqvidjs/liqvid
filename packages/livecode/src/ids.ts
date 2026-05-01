import { sanitize } from "./utils.ts";

export const ids = {
  editorGroup: ({ group }: { group: string }) => `lqv-group-${group}`,
  editorPanel: ({ filename, group }: { filename: string; group: string }) =>
    `lqv-panel-${group}-${sanitize(filename)}`,
  fileTab: ({ filename, group }: { filename: string; group: string }) =>
    `lqv-tab-${group}-${sanitize(filename)}`,
  groupTab: ({ group }: { group: string }) => `lqv-grouptab-${group}`,
};
