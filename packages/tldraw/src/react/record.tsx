import type { Editor } from "@tldraw/editor";
import { useEffect } from "react";
import { Tldraw, useEditor } from "tldraw";

import { reconcileRestoredShapeLocks } from "../dev-mode.ts";

import {
  AttachSymbol,
  BubbleKeyboardEvents,
  ProvideEditorToRecording,
  SetDataAffords,
  SetDevOnlyShapeSvgAttributes,
  SetTldrawColorScheme,
} from "./helpers.tsx";

export function TldrawRecord({
  children,
  // Recreating the editor on theme change drops dev-mode lock memory and
  // leaves every shape locked. SetTldrawColorScheme updates the theme in place.
  colorScheme: _colorScheme,
  ...props
}: React.ComponentPropsWithoutRef<typeof Tldraw>) {
  return (
    <Tldraw {...props}>
      <BubbleKeyboardEvents />
      <SetTldrawColorScheme />
      <ProvideEditorToRecording />
      <AttachSymbol />
      <SetDataAffords />
      <SetDevOnlyShapeSvgAttributes />
      <ReconcileRestoredShapeLocks />
      {children}
    </Tldraw>
  );
}

function snapshotHasDocument(
  snapshot: Parameters<Editor["loadSnapshot"]>[0],
): boolean {
  return "store" in snapshot || snapshot.document !== undefined;
}

/**
 * Snapshot restores keep the lock state from whichever mode was saved.
 * Dev-only shapes stay editable in dev mode; other shapes stay editable in
 * regular mode.
 */
function ReconcileRestoredShapeLocks() {
  const editor = useEditor();

  useEffect(() => {
    const loadSnapshot = editor.loadSnapshot;

    editor.loadSnapshot = (snapshot, opts) => {
      const result = loadSnapshot.call(editor, snapshot, opts);
      if (snapshotHasDocument(snapshot)) {
        reconcileRestoredShapeLocks(editor);
      }
      return result;
    };

    return () => {
      editor.loadSnapshot = loadSnapshot;
    };
  }, [editor]);

  return null;
}
