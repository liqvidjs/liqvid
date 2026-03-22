/**
 * Sanitize a string for use as a CSS class or ID
 */
export function sanitize(str: string): string {
  return str.replace(/[^A-Za-z0-9_-]/g, "_");
}

export const ids = {
  editorGroup: ({ group }: { group: string }) => `lqv-group-${group}`,
  editorPanel: ({ filename, group }: { filename: string; group: string }) =>
    `lqv-panel-${group}-${sanitize(filename)}`,
  fileTab: ({ filename, group }: { filename: string; group: string }) =>
    `lqv-tab-${group}-${sanitize(filename)}`,
  groupTab: ({ group }: { group: string }) => `lqv-grouptab-${group}`,
};
