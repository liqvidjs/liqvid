import { useCallback } from "react";

import { selectActiveFile } from "../selectors.ts";
import { useLiveCodeStore } from "../store.ts";
import { download, getFileType, viewContents } from "../utils.ts";

/** download all the files in the active group as a .zip */
export function useDownloadAll(
  /**
   * filename for the .zip file
   * @default example.zip
   */
  filename = "example.zip",
) {
  const store = useLiveCodeStore();

  return useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const { activeGroup, groups } = store.getState();

    if (!activeGroup) {
      console.warn("no active group");
      return;
    }

    for (const { filename, view } of groups[activeGroup].files) {
      zip.file(filename, viewContents(view));
    }

    const content = await zip.generateAsync({ type: "blob" });

    download({ content, filename });
  }, [filename, store]);
}

/**
 * Download the content of the active file.
 */
export function useDownloadCurrent() {
  const store = useLiveCodeStore();
  return useCallback(() => {
    const { filename, view } = selectActiveFile(store.getState());

    download({
      content: viewContents(view),
      filename,
      mime: getMimeType(getFileType(filename)),
    });
  }, [store]);
}

/** guess the MIME type of a file from its extension */
function getMimeType(extension: string) {
  switch (extension) {
    case "c":
    case "cpp":
      return "text/x-c";
    case "css":
      return "text/css";
    case "html":
      return "text/html";
    case "java":
      return "text/x-java";
    case "js":
    case "jsx":
      return "text/javascript";
    case "md":
      return "text/markdown";
    case "py":
      return "text/x-python";
    case "rs":
      return "text/rust";
    case "sql":
      return "text/sql";
    case "ts":
    case "tsx":
      return "text/javascript";
    case "xml":
      return "application/xml";
    default:
      return "text/plain";
  }
}
