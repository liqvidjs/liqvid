import type { EditorView } from "@codemirror/view";

/**
 * Get file extension.
 * @param filename Name of file.
 * @returns File extension.
 */
export function getFileType(filename: string) {
  return filename.slice(filename.lastIndexOf(".") + 1);
}

/**
 * Sanitize a string for use as a CSS class or ID
 */
export function sanitize(str: string): string {
  return str.replace(/[^A-Za-z0-9_-]/g, "_");
}

export function viewContents(view: EditorView) {
  return view.state.doc.toString();
}
