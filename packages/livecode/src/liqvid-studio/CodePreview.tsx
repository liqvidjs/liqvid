"use client";

import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import type { Extension } from "@codemirror/state";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  PlainString,
} from "@liqvid/studio/ui";

import { Editor } from "../components/Editor.tsx";
import { EditorGroup } from "../components/EditorGroup.tsx";
import { EditorPanel } from "../components/EditorPanel.tsx";
import { FileTabs } from "../components/FileTabs.tsx";
import { LiveCode } from "../components/Root.tsx";
import { basicSetup } from "../extensions.ts";
import { getFileType } from "../utils.ts";

import type { SavedState } from "./types.ts";

import "./preview.css";

export function CodePreview({
  onClose,
  savedState,
}: {
  onClose: () => void;
  savedState: SavedState | null;
}) {
  return (
    <DialogRoot onOpenChange={(open) => !open && onClose()} open={!!savedState}>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup size="large">
          <DialogTitle>
            {PlainString(savedState?.name ?? "Saved code state")}
          </DialogTitle>
          <DialogClose />
          {savedState && (
            <LiveCode className="lqv-code-preview" name="saved-code-preview">
              <FileTabs
                classNames={{
                  container: "lqv-code-preview-tabs",
                  tab: "lqv-code-preview-tab",
                }}
              />
              <EditorGroup name="preview">
                {Object.entries(savedState.files).map(([filename, content]) => (
                  <EditorPanel filename={filename} key={filename}>
                    <Editor
                      className="lqv-code-preview-editor"
                      content={content}
                      extensions={[basicSetup, getLanguageExtension(filename)]}
                      readOnly
                    />
                  </EditorPanel>
                ))}
              </EditorGroup>
            </LiveCode>
          )}
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}

function getLanguageExtension(filename: string): Extension {
  switch (getFileType(filename).toLowerCase()) {
    case "css":
      return css();
    case "html":
    case "htm":
      return html();
    case "js":
    case "mjs":
    case "cjs":
      return javascript();
    case "jsx":
      return javascript({ jsx: true });
    case "ts":
    case "mts":
    case "cts":
      return javascript({ typescript: true });
    case "tsx":
      return javascript({ jsx: true, typescript: true });
    default:
      return [];
  }
}
