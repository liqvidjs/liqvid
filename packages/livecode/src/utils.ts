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

/** Download a file with the given content and filename. */
export async function download({
  content,
  filename,
  mime,
}:
  | {
      content: string;
      filename: string;
      mime: string;
    }
  | {
      content: Blob;
      filename: string;
      mime?: undefined;
    }) {
  let blob: Blob;
  if (typeof content === "string") {
    blob = new Blob([content], { type: mime });
  } else {
    blob = content;
  }

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;

  // Append to the DOM
  document.body.appendChild(anchor);

  // Trigger `click` event
  anchor.click();

  // Remove element from DOM
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
