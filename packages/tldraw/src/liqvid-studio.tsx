"use client";

import {
  Button,
  DockableDialog,
  type LocalizedString,
  PlainString,
} from "@liqvid/studio/ui";
import { spacing, typeface } from "@liqvid/studio/ui/design-tokens.stylex.ts";
import { useProjectParams, useProjectPath } from "@liqvid/studio-plugin-api";
import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import type { Editor } from "tldraw";

import { listSaved, saveSnapshot } from "./liqvid-studio/server.ts";
import type { SavedState } from "./liqvid-studio/types.ts";
import { TLDRAW_SYMBOL } from "./symbols.ts";

export type TldrawHelperProps = {
  shortcuts?: {
    /** Shortcut to toggle the Recording panel */
    toggle?: string;

    /** Shortcut to discard recording */
    discard?: string;

    /** Shortcut to pause recording */
    pause?: string;

    /** Shortcut to start/stop recording */
    startStop?: string;
  };
};

const styles = stylex.create({
  actions: {
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    textAlign: "right",
  },

  caption: {
    fontWeight: "bold",
    textAlign: "left",
  },

  capture: {
    marginLeft: "auto",
  },

  name: {
    fontFamily: typeface.mono,
    fontWeight: "normal",
    paddingInline: spacing.md,
    textAlign: "left",
  },

  restore: {
    float: "right",
  },

  table: {
    marginBottom: spacing.md,
    width: "100%",
  },

  trigger: {
    alignItems: "center",
    backgroundColor: "red",
    cursor: "pointer",
    display: "inline-flex",
    fontWeight: "bold",
    height: 36,
    justifyContent: "center",
    textAlign: "center",
    width: 36,
  },
});

/**
 * Liqvid recording control.
 */
export function TldrawHelper({ shortcuts }: TldrawHelperProps) {
  const [saved, setSaved] = useState<readonly SavedState[]>([]);
  const projectPath = useProjectPath();
  const params = useProjectParams();

  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    setEditor(
      (
        document.querySelector(".tl-container") as {
          [key: symbol]: Editor;
        } | null
      )?.[TLDRAW_SYMBOL] ?? null,
    );

    listSaved(projectPath, params).then(setSaved);
  }, [projectPath, params]);

  const capture = () => {
    if (!editor) return;

    const snapshot = editor.getSnapshot();

    saveSnapshot(projectPath, params, snapshot).then((newSaved) => {
      setSaved((prev) => [...prev, newSaved]);
    });
  };

  const t = {
    caption: "Saved states" as LocalizedString,
    capture: "Capture" as LocalizedString,
    restore: "Restore" as LocalizedString,
  };

  return (
    <DockableDialog.Root name="tldraw" shortcut={shortcuts?.toggle}>
      <DockableDialog.Trigger asChild>
        <button sx={styles.trigger} title="tldraw" type="button">
          {PlainString(";")}
        </button>
      </DockableDialog.Trigger>

      <DockableDialog.Dialog>
        <DockableDialog.Header>{PlainString("tldraw")}</DockableDialog.Header>
        <DockableDialog.Content>
          <table sx={styles.table}>
            <caption sx={styles.caption}>{t.caption}</caption>
            <tbody>
              {saved.map((s) => (
                <tr key={s.name}>
                  <th sx={styles.name}>{s.name}</th>
                  <td sx={styles.actions}>
                    <Button
                      onClick={() => editor?.loadSnapshot(s.snapshot)}
                      size="small"
                      style={styles.restore}
                    >
                      {t.restore}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button kind="primary" onClick={capture} style={styles.capture}>
            {t.capture}
          </Button>
        </DockableDialog.Content>
      </DockableDialog.Dialog>
    </DockableDialog.Root>
  );
}
