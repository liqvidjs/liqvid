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
  useServerTranslations,
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
import { useEffect, useReducer } from "react";
import { TldrawImage, TldrawUiContextProvider, TldrawUiIcon } from "tldraw";

import { rememberUserLocksInSnapshot } from "../dev-mode.ts";
import { icon } from "../recording.tsx";
import { TLDRAW_SYMBOL } from "../symbols.ts";
import { fastClone } from "../utils.ts";

import { CopySavedStateDialog } from "./CopySavedStateDialog.tsx";
import {
  deleteSnapshot,
  getTranslations,
  listSaved,
  makeSnapshotGlobal,
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
  if (camera) {
    editor.setCamera(camera);
  }
}

type TldrawState = {
  actionError: string | null;
  copyTarget: SavedState | null;
  deleteTarget: SavedState | null;
  editor: Editor | null;
  overwriteError: string | null;
  overwriteTarget: SavedState | null;
  renameError: string | null;
  renameTarget: SavedState | null;
  renameValue: string;
  saved: readonly SavedState[];
};

type TldrawAction =
  | { kind: "actionError"; value: string | null }
  | { kind: "copyTarget"; value: SavedState | null }
  | { kind: "deleteTarget"; value: SavedState | null }
  | { kind: "editor"; value: Editor | null }
  | { kind: "overwriteError"; value: string | null }
  | { kind: "overwriteTarget"; value: SavedState | null }
  | { kind: "rename"; target: SavedState; value: string }
  | { kind: "renameError"; value: string | null }
  | { kind: "renameTarget"; value: SavedState | null }
  | { kind: "renameValue"; value: string }
  | { kind: "saved"; value: readonly SavedState[] }
  | { kind: "savedAdd"; value: SavedState };

function tldrawReducer(state: TldrawState, action: TldrawAction): TldrawState {
  switch (action.kind) {
    case "actionError": {
      return { ...state, actionError: action.value };
    }
    case "copyTarget": {
      return { ...state, copyTarget: action.value };
    }
    case "deleteTarget": {
      return { ...state, deleteTarget: action.value };
    }
    case "editor": {
      return { ...state, editor: action.value };
    }
    case "overwriteError": {
      return { ...state, overwriteError: action.value };
    }
    case "overwriteTarget": {
      return { ...state, overwriteTarget: action.value };
    }
    case "rename": {
      return {
        ...state,
        renameTarget: action.target,
        renameValue: action.value,
      };
    }
    case "renameError": {
      return { ...state, renameError: action.value };
    }
    case "renameTarget": {
      return { ...state, renameTarget: action.value };
    }
    case "renameValue": {
      return { ...state, renameValue: action.value };
    }
    case "saved": {
      return { ...state, saved: action.value };
    }
    case "savedAdd": {
      return { ...state, saved: [...state.saved, action.value] };
    }
  }
}

/**
 * Liqvid recording control.
 */
export function TldrawHelper({ shortcut }: TldrawHelperProps) {
  const t = useServerTranslations(
    Translations as T,
    getTranslations,
    "Failed to load tldraw translations",
  );
  const projectPath = useProjectPath();
  const params = useProjectParams();
  const { colorScheme } = useColorScheme();

  const [state, dispatch] = useReducer(tldrawReducer, {
    actionError: null,
    copyTarget: null,
    deleteTarget: null,
    editor: null,
    overwriteError: null,
    overwriteTarget: null,
    renameError: null,
    renameTarget: null,
    renameValue: "",
    saved: [],
  });
  const {
    actionError,
    copyTarget,
    deleteTarget,
    editor,
    overwriteError,
    overwriteTarget,
    renameError,
    renameTarget,
    renameValue,
    saved,
  } = state;

  useEffect(() => {
    waitFor(() => {
      return (
        (
          document.querySelector(".tl-container") as {
            [key: symbol]: Editor;
          } | null
        )?.[TLDRAW_SYMBOL] ?? null
      );
    }).then((value) => dispatch({ kind: "editor", value }));

    listSaved(projectPath, params).then((value) =>
      dispatch({ kind: "saved", value }),
    );
  }, [projectPath, params]);

  const capture = () => {
    if (!editor) {
      return;
    }

    // Live records are not plain objects, and their ids contain ":". React
    // Flight encodes those as opaque temporary references, which the server
    // action cannot resolve. Snapshots are JSON; clone before sending.
    const snapshot = rememberUserLocksInSnapshot(
      editor,
      fastClone(editor.getSnapshot()),
    );

    saveSnapshot(
      projectPath,
      params,
      snapshot,
      saved.filter((state) => !state.isGlobal).length,
    ).then((newSaved) => {
      dispatch({ kind: "savedAdd", value: newSaved });
    });
  };

  const overwrite = (savedState: SavedState) => {
    dispatch({ kind: "overwriteError", value: null });
    dispatch({ kind: "overwriteTarget", value: savedState });
  };

  const performOverwrite = async () => {
    if (!overwriteTarget || !editor) {
      return;
    }

    try {
      await overwriteSnapshot(
        projectPath,
        params,
        overwriteTarget.name,
        rememberUserLocksInSnapshot(editor, fastClone(editor.getSnapshot())),
        overwriteTarget.isGlobal,
      );
      dispatch({
        kind: "saved",
        value: await listSaved(projectPath, params),
      });
      dispatch({ kind: "overwriteTarget", value: null });
    } catch (error) {
      dispatch({
        kind: "overwriteError",
        value:
          error instanceof Error ? error.message : t.errors.overwriteFailed,
      });
    }
  };

  const rename = (savedState: SavedState) => {
    dispatch({ kind: "renameError", value: null });
    dispatch({
      kind: "rename",
      target: savedState,
      value: savedState.name,
    });
  };

  const performRename = async () => {
    if (!renameTarget) {
      return;
    }

    const newName = renameValue.trim();
    if (!newName || newName === renameTarget.name) {
      return;
    }

    try {
      await renameSnapshot(
        projectPath,
        params,
        renameTarget.name,
        newName,
        renameTarget.isGlobal,
      );
      dispatch({
        kind: "saved",
        value: await listSaved(projectPath, params),
      });
      dispatch({ kind: "renameTarget", value: null });
    } catch (error) {
      dispatch({
        kind: "renameError",
        value: error instanceof Error ? error.message : t.errors.renameFailed,
      });
    }
  };

  const remove = (savedState: SavedState) => {
    dispatch({ kind: "deleteTarget", value: savedState });
  };

  const performDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    await deleteSnapshot(
      projectPath,
      params,
      deleteTarget.name,
      deleteTarget.isGlobal,
    );
    dispatch({
      kind: "saved",
      value: await listSaved(projectPath, params),
    });
    dispatch({ kind: "deleteTarget", value: null });
  };

  const sortedProjectSaved = saved
    .filter((state) => !state.isGlobal)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const sortedGlobalSaved = saved
    .filter((state) => state.isGlobal)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const makeGlobal = async (savedState: SavedState) => {
    dispatch({ kind: "actionError", value: null });
    try {
      await makeSnapshotGlobal(projectPath, params, savedState.name);
      dispatch({
        kind: "saved",
        value: await listSaved(projectPath, params),
      });
    } catch (error) {
      dispatch({
        kind: "actionError",
        value:
          error instanceof Error ? error.message : t.errors.makeGlobalFailed,
      });
    }
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
                  <tr>
                    <th colSpan={3} sx={styles.header}>
                      {t.projectStates}
                    </th>
                  </tr>
                  {sortedProjectSaved.map((s) => (
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
                            onClick={() =>
                              dispatch({ kind: "copyTarget", value: s })
                            }
                            size="small"
                            title={t.copy}
                          >
                            {t.copy}
                          </Button>
                          <Button
                            onClick={() => void makeGlobal(s)}
                            size="small"
                            title={t.makeGlobal}
                          >
                            {t.makeGlobal}
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
                  <tr>
                    <th colSpan={3} sx={styles.header}>
                      {t.globalStates}
                    </th>
                  </tr>
                  {sortedGlobalSaved.map((s) => (
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
                                  onSelect: () =>
                                    editor &&
                                    restoreViewport(editor, s.snapshot),
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
                            onClick={() =>
                              dispatch({ kind: "copyTarget", value: s })
                            }
                            size="small"
                            title={t.copy}
                          >
                            {t.copy}
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
              {actionError && (
                <p role="alert" sx={styles.error}>
                  {actionError}
                </p>
              )}
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
          if (!open) {
            dispatch({ kind: "renameTarget", value: null });
          }
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
                dispatch({ kind: "renameError", value: null });
                dispatch({ kind: "renameValue", value });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void performRename();
                }
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

      <DialogRoot
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ kind: "copyTarget", value: null });
          }
        }}
        open={!!copyTarget}
      >
        <DialogPortal>
          <DialogBackdrop />
          <CopySavedStateDialog
            currentParams={params}
            currentProjectPath={projectPath}
            onClose={() => dispatch({ kind: "copyTarget", value: null })}
            open={!!copyTarget}
            savedState={copyTarget}
            t={t}
          />
        </DialogPortal>
      </DialogRoot>

      <AlertDialogRoot
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ kind: "overwriteError", value: null });
            dispatch({ kind: "overwriteTarget", value: null });
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
          if (!open) {
            dispatch({ kind: "deleteTarget", value: null });
          }
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
