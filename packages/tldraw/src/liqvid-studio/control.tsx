"use client";

import "./stylex.css";

import { useColorScheme } from "@liqvid/color-scheme/react";
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
  ButtonWithDropdown,
  DialogActions,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DockableDialog,
  PlainString,
  TextField,
} from "@liqvid/studio/ui";
import {
  colors,
  rounded,
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
import { TldrawImage, TldrawUiContextProvider, TldrawUiIcon } from "tldraw";

import { rememberUserLocksInSnapshot } from "../dev-mode.ts";
import { icon } from "../recording.tsx";
import { TLDRAW_SYMBOL } from "../symbols.ts";
import { fastClone } from "../utils.ts";

import {
  deleteSnapshot,
  getTranslations,
  listSaved,
  overwriteSnapshot,
  renameSnapshot,
  saveSnapshot,
} from "./server.ts";
import type { SavedState } from "./types.ts";

import Translations from "./.translations/en.json";

type T = Awaited<ReturnType<typeof getTranslations>>;

/**
 * English strings render immediately. The server action then swaps in the
 * studio locale. `useAsyncTranslations` cannot do this: it only reads files
 * inside the studio package.
 */
function useServerTranslations(defaults: T, load: () => Promise<T>): T {
  const [translations, setTranslations] = useState(defaults);

  useEffect(() => {
    load().then(setTranslations, (error: unknown) => {
      console.error("Failed to load tldraw translations", error);
    });
  }, [load]);

  return translations;
}

export type TldrawHelperProps = {
  shortcut?: ShortcutsSpecifier;
};

const styles = stylex.create({
  actions: {
    display: "flex",
    gap: spacing.sm,
    textAlign: "right",
  },

  caption: {
    fontWeight: "bold",
  },

  capture: {
    marginLeft: "auto",
  },

  cell: {
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
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

  preview: {
    borderRadius: rounded.md,
    height: 72,
    overflow: "hidden",
    width: 112,
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

function restoreViewport(editor: Editor, snapshot: SavedState["snapshot"]) {
  const savedPageId = snapshot.session.currentPageId;
  const pageId =
    savedPageId && editor.getPages().some((page) => page.id === savedPageId)
      ? savedPageId
      : editor.getCurrentPageId();

  editor.setCurrentPage(pageId);

  const camera = snapshot.session.pageStates?.find(
    (pageState) => pageState.pageId === pageId,
  )?.camera;
  if (camera) editor.setCamera(camera);
}

/**
 * Liqvid recording control.
 */
export function TldrawHelper({ shortcut }: TldrawHelperProps) {
  const t = useServerTranslations(Translations as T, getTranslations);
  const [saved, setSaved] = useState<readonly SavedState[]>([]);
  const projectPath = useProjectPath();
  const params = useProjectParams();
  const { colorScheme } = useColorScheme();

  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedState | null>(null);
  const [overwriteError, setOverwriteError] = useState<string | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<SavedState | null>(
    null,
  );
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<SavedState | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    waitFor(() => {
      return (
        (
          document.querySelector(".tl-container") as {
            [key: symbol]: Editor;
          } | null
        )?.[TLDRAW_SYMBOL] ?? null
      );
    }).then(setEditor);

    listSaved(projectPath, params).then(setSaved);
  }, [projectPath, params]);

  const capture = () => {
    if (!editor) return;

    // Live records are not plain objects, and their ids contain ":". React
    // Flight encodes those as opaque temporary references, which the server
    // action cannot resolve. Snapshots are JSON; clone before sending.
    const snapshot = rememberUserLocksInSnapshot(
      editor,
      fastClone(editor.getSnapshot()),
    );

    saveSnapshot(projectPath, params, snapshot, saved.length).then(
      (newSaved) => {
        setSaved((prev) => [...prev, newSaved]);
      },
    );
  };

  const overwrite = (savedState: SavedState) => {
    setOverwriteError(null);
    setOverwriteTarget(savedState);
  };

  const performOverwrite = async () => {
    if (!overwriteTarget || !editor) return;

    try {
      await overwriteSnapshot(
        projectPath,
        params,
        overwriteTarget.name,
        rememberUserLocksInSnapshot(editor, fastClone(editor.getSnapshot())),
      );
      setSaved(await listSaved(projectPath, params));
      setOverwriteTarget(null);
    } catch (error) {
      setOverwriteError(
        error instanceof Error ? error.message : t.errors.overwriteFailed,
      );
    }
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
      setRenameError(
        error instanceof Error ? error.message : t.errors.renameFailed,
      );
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

  const sortedSaved = [...saved].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );

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
          <DockableDialog.Content size="auto">
            <TldrawUiContextProvider>
              <table sx={styles.table}>
                <caption sx={styles.caption}>{t.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" sx={styles.header}>
                      {t.headers.name}
                    </th>
                    <th scope="col" sx={styles.header}>
                      {t.headers.preview}
                    </th>
                    {/* <th scope="col" sx={styles.header}> */}
                    {/*   {t.headers.date} */}
                    {/* </th> */}
                    <th scope="col" sx={[styles.header, x.textAlign.right]}>
                      {t.headers.actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSaved.map((s) => (
                    <tr key={s.name}>
                      <td sx={styles.cell}>
                        <div aria-hidden="true" sx={styles.preview}>
                          <TldrawImage
                            background
                            darkMode={colorScheme === "dark"}
                            padding={8}
                            snapshot={s.snapshot}
                          />
                        </div>
                      </td>
                      <th scope="row" sx={styles.name}>
                        {s.name}
                      </th>
                      {/* <td sx={styles.cell}> */}
                      {/*   <Time */}
                      {/*     format="date-and-time" */}
                      {/*     value={s.createdAt} */}
                      {/*     {...stylex.props(styles.created)} */}
                      {/*   /> */}
                      {/* </td> */}
                      <td sx={styles.cell}>
                        <div sx={styles.actions}>
                          <div sx={styles.restore}>
                            <ButtonWithDropdown
                              disabled={!editor}
                              dropdownLabel={t.restoreOptions}
                              onClick={() => editor?.loadSnapshot(s.snapshot)}
                              options={[
                                {
                                  id: "restore-viewport",
                                  label: t.restoreViewport,
                                  onSelect: () => {
                                    if (editor) {
                                      restoreViewport(editor, s.snapshot);
                                    }
                                  },
                                },
                                {
                                  id: "restore-shapes",
                                  label: t.restoreShapes,
                                  onSelect: () =>
                                    editor?.loadSnapshot({
                                      document: s.snapshot.document,
                                    }),
                                },
                              ]}
                            >
                              {t.restore}
                            </ButtonWithDropdown>
                          </div>
                          <Button
                            disabled={!editor}
                            onClick={() => overwrite(s)}
                            size="small"
                            title={t.overwrite}
                          >
                            <TldrawUiIcon
                              icon="arrow-cycle"
                              label={t.overwrite}
                            />
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
                        </div>
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
              data-affords="keys"
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
          if (!open) {
            setOverwriteError(null);
            setOverwriteTarget(null);
          }
        }}
        open={!!overwriteTarget}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="auto">
            <AlertDialogTitle>{t.overwrite}</AlertDialogTitle>
            <AlertDialogClose />
            <p sx={styles.dialogText}>{t.confirmOverwrite}</p>
            {overwriteError && <p sx={styles.error}>{overwriteError}</p>}
            <AlertDialogActions>
              <Button
                disabled={!editor}
                kind="destructive"
                onClick={performOverwrite}
              >
                {t.overwrite}
              </Button>
            </AlertDialogActions>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialogRoot>

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
