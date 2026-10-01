"use client";

import "./liqvid-studio/stylex.css";

import type { ShortcutsSpecifier } from "@liqvid/keymap";
import {
  AlertDialogActions,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
  Button,
  DialogActions,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DockableDialog,
  type LocalizedString,
  PlainString,
  TextField,
  Time,
} from "@liqvid/studio/ui";
import {
  colors,
  spacing,
  text,
  typeface,
} from "@liqvid/studio/ui/design-tokens.stylex.ts";
import { useProjectParams, useProjectPath } from "@liqvid/studio-plugin-api";
import { waitFor } from "@liqvid/utils";
import x from "@stylexjs/atoms";
import * as stylex from "@stylexjs/stylex";
import type { Editor } from "@tldraw/editor";
import { useEffect, useState } from "react";
import { TldrawUiContextProvider, TldrawUiIcon } from "tldraw";

import {
  deleteSnapshot,
  listSaved,
  renameSnapshot,
  saveSnapshot,
} from "./liqvid-studio/server.ts";
import type { SavedState } from "./liqvid-studio/types.ts";
import { icon } from "./recording.tsx";
import { TLDRAW_SYMBOL } from "./symbols.ts";

export type TldrawHelperProps = {
  shortcut?: ShortcutsSpecifier;
};

const styles = stylex.create({
  actions: {
    display: "flex",
    gap: spacing.sm,
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    textAlign: "right",
  },

  caption: {
    fontWeight: "bold",
  },

  capture: {
    marginLeft: "auto",
  },

  created: {
    color: colors.secondary,
    fontSize: text.xs,
  },

  dialogText: {
    marginBlock: spacing.lg,
  },

  error: {
    color: colors.destroy,
    marginTop: spacing.sm,
  },

  header: {
    fontSize: text.base,
    paddingInline: spacing.md,
    textAlign: "left",
  },

  input: {
    borderColor: colors.graySep,
    borderRadius: 4,
    borderStyle: "solid",
    borderWidth: 1,
    boxSizing: "border-box",
    padding: spacing.sm,
    width: "100%",
  },

  name: {
    fontFamily: typeface.mono,
    fontWeight: "normal",
    paddingInline: spacing.md,
    textAlign: "left",
  },

  restore: {
    marginLeft: "auto",
  },

  table: {
    marginBottom: spacing.huge,
    width: "100%",
  },

  trigger: {
    alignItems: "center",
    color: {
      ":active": colors.grayActive,
      ":hover": colors.grayHover,
      default: colors.grayApp,
    },
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
export function TldrawHelper({ shortcut }: TldrawHelperProps) {
  const [saved, setSaved] = useState<readonly SavedState[]>([]);
  const projectPath = useProjectPath();
  const params = useProjectParams();

  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedState | null>(null);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedState | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    waitFor(
      () =>
        (
          document.querySelector(".tl-container") as {
            [key: symbol]: Editor;
          } | null
        )?.[TLDRAW_SYMBOL] ?? null,
    ).then(setEditor);

    listSaved(projectPath, params).then(setSaved);
  }, [projectPath, params]);

  const capture = () => {
    if (!editor) return;

    const snapshot = editor.getSnapshot();

    saveSnapshot(projectPath, params, snapshot, saved.length).then(
      (newSaved) => {
        setSaved((prev) => [...prev, newSaved]);
      },
    );
  };

  const rename = (savedState: SavedState) => {
    setRenameError(null);
    setRenameTarget(savedState);
    setRenameValue(savedState.name);
  };

  const performRename = async () => {
    if (!renameTarget) return;

    const newName = renameValue.trim();
    if (!newName || newName === renameTarget.name) return;

    try {
      await renameSnapshot(projectPath, params, renameTarget.name, newName);
      setSaved(await listSaved(projectPath, params));
      setRenameTarget(null);
    } catch (error) {
      setRenameError(error instanceof Error ? error.message : "Rename failed");
    }
  };

  const remove = (savedState: SavedState) => {
    setDeleteTarget(savedState);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;

    await deleteSnapshot(projectPath, params, deleteTarget.name);
    setSaved(await listSaved(projectPath, params));
    setDeleteTarget(null);
  };

  const t = {
    cancel: "Cancel" as LocalizedString,
    caption: "Saved states" as LocalizedString,
    capture: "Capture" as LocalizedString,
    confirmDelete:
      "Are you sure you want to delete this saved state?" as LocalizedString,
    delete: "Delete" as LocalizedString,
    headers: {
      actions: "Actions" as LocalizedString,
      date: "Date" as LocalizedString,
      name: "Name" as LocalizedString,
    },
    newName: "New name" as LocalizedString,
    rename: "Rename" as LocalizedString,
    restore: "Restore" as LocalizedString,
  };

  return (
    <>
      <DockableDialog.Root closeOnEscape name="tldraw" shortcut={shortcut}>
        <DockableDialog.Trigger asChild>
          <button sx={styles.trigger} title="tldraw" type="button">
            {icon({ height: 24, width: 24 })}
          </button>
        </DockableDialog.Trigger>

        <DockableDialog.Dialog>
          <DockableDialog.Header>{PlainString("tldraw")}</DockableDialog.Header>
          <DockableDialog.Content>
            <TldrawUiContextProvider>
              <table sx={styles.table}>
                <caption sx={styles.caption}>{t.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" sx={styles.header}>
                      {t.headers.name}
                    </th>
                    <th scope="col" sx={styles.header}>
                      {t.headers.date}
                    </th>
                    <th scope="col" sx={[styles.header, x.textAlign.right]}>
                      {t.headers.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {saved.map((s) => (
                    <tr key={s.name}>
                      <th sx={styles.name}>{s.name}</th>
                      <td sx={styles.created}>
                        <Time format="date-and-time" value={s.createdAt} />
                      </td>
                      <td sx={styles.actions}>
                        <Button
                          onClick={() => editor?.loadSnapshot(s.snapshot)}
                          size="small"
                          style={styles.restore}
                        >
                          {t.restore}
                        </Button>
                        <Button
                          onClick={() => rename(s)}
                          size="small"
                          title={t.rename}
                        >
                          <TldrawUiIcon icon="edit" label={t.rename} />
                        </Button>
                        <Button
                          kind="destructive"
                          onClick={() => remove(s)}
                          size="small"
                          title={t.delete}
                        >
                          <TldrawUiIcon icon="trash" label={t.delete} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button
                disabled={!editor}
                kind="primary"
                onClick={capture}
                style={styles.capture}
              >
                {t.capture}
              </Button>
            </TldrawUiContextProvider>
          </DockableDialog.Content>
        </DockableDialog.Dialog>
      </DockableDialog.Root>

      <DialogRoot
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        open={!!renameTarget}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup size="auto">
            <DialogTitle>{t.rename}</DialogTitle>
            <DialogClose />
            <TextField
              label={t.newName}
              onChange={(value) => {
                setRenameError(null);
                setRenameValue(value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void performRename();
              }}
              sx={styles.input}
              value={renameValue}
            />
            {renameError && <p sx={styles.error}>{renameError}</p>}
            <DialogActions>
              <Button disabled={!renameValue.trim()} onClick={performRename}>
                {t.rename}
              </Button>
            </DialogActions>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>

      <AlertDialogRoot
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        open={!!deleteTarget}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="auto">
            <AlertDialogTitle>{t.delete}</AlertDialogTitle>
            <AlertDialogClose />
            <p sx={styles.dialogText}>{t.confirmDelete}</p>
            <AlertDialogActions>
              <Button kind="destructive" onClick={performDelete}>
                {t.delete}
              </Button>
            </AlertDialogActions>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialogRoot>
    </>
  );
}
