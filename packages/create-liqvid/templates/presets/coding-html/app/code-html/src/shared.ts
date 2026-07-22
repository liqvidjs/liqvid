import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import type { Extension } from "@codemirror/state";
import { getFileType } from "@lqv/livecode";

export function getLanguageExtension(filename: string): Extension {
  switch (getFileType(filename)) {
    case "css":
      return css();
    case "html":
      return html();
    case "js":
      return javascript();
  }

  return [];
}
