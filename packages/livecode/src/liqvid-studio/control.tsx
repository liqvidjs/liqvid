"use client";

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
  PlainString,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPopup,
  SelectPortal,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  TextField,
  useServerTranslations,
} from "@liqvid/studio/ui";
import {
  colors,
  spacing,
  text,
} from "@liqvid/studio/ui/design-tokens.stylex.ts";
import {
  useProjectParams,
  useProjectPath,
  useRegisteredInstances,
} from "@liqvid/studio-plugin-api";
import { CodeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useReducer, useState } from "react";

import type { LiveCodeStudioInstance } from "../components/Root.tsx";

import { CodePreview } from "./CodePreview.tsx";
import { CopySavedStateDialog } from "./CopySavedStateDialog.tsx";
import { SavedStateList } from "./SavedStateList.tsx";
import {
  deleteState,
  getTranslations,
  listSaved,
  makeStateGlobal,
  overwriteState,
  renameState,
  saveState,
} from "./server.ts";
import type { SavedState } from "./types.ts";

import Translations from "./.translations/en.json";

type T = Awaited<ReturnType<typeof getTranslations>>;

export type LiveCodeHelperProps = {
  shortcut?: ShortcutsSpecifier;
};

const styles = stylex.create({
  caption: { fontWeight: "bold" },
  content: { display: "flex", flexDirection: "column", gap: spacing.md },
  error: { color: colors.destroy, marginTop: spacing.sm },
  header: { fontSize: text.base, paddingInline: spacing.md, textAlign: "left" },
  table: { marginBottom: spacing.huge, minWidth: "42rem", width: "100%" },
  trigger: {
    alignItems: "center",
    color: {
      ":active": colors.grayActive,
      ":hover": colors.grayHover,
      default: colors.grayApp,
    },
    cursor: "pointer",
    display: "inline-flex",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
});

function useInstanceFiles(instance: LiveCodeStudioInstance | undefined) {
  const [files, setFiles] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => {
    if (!instance) {
      setFiles({});
      return;
    }
    const update = () => setFiles(instance.getFiles());
    update();
    return instance.subscribe(update);
  }, [instance]);
  return files;
}

type LiveCodeState = {
  copyTarget: SavedState | null;
  deleteTarget: SavedState | null;
  error: string | null;
  overwriteTarget: SavedState | null;
  previewTarget: SavedState | null;
  renameTarget: SavedState | null;
  renameValue: string;
  saved: readonly SavedState[];
  selectedIndex: string;
};

type LiveCodeAction =
  | { kind: "copyTarget"; value: SavedState | null }
  | { kind: "deleteTarget"; value: SavedState | null }
  | { kind: "error"; value: string | null }
  | { kind: "overwriteTarget"; value: SavedState | null }
  | { kind: "previewTarget"; value: SavedState | null }
  | { kind: "rename"; target: SavedState; value: string }
  | { kind: "renameTarget"; value: SavedState | null }
  | { kind: "renameValue"; value: string }
  | { kind: "saved"; value: readonly SavedState[] }
  | { kind: "savedAdd"; value: SavedState }
  | { kind: "selectedIndex"; value: string };

function liveCodeReducer(
  state: LiveCodeState,
  action: LiveCodeAction,
): LiveCodeState {
  switch (action.kind) {
    case "copyTarget": {
      return { ...state, copyTarget: action.value };
    }
    case "deleteTarget": {
      return { ...state, deleteTarget: action.value };
    }
    case "error": {
      return { ...state, error: action.value };
    }
    case "overwriteTarget": {
      return { ...state, overwriteTarget: action.value };
    }
    case "previewTarget": {
      return { ...state, previewTarget: action.value };
    }
    case "rename": {
      return {
        ...state,
        renameTarget: action.target,
        renameValue: action.value,
      };
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
    case "selectedIndex": {
      return { ...state, selectedIndex: action.value };
    }
  }
}

export function LiveCodeHelper({ shortcut }: LiveCodeHelperProps) {
  const t = useServerTranslations(
    Translations as T,
    getTranslations,
    "Failed to load LiveCode translations",
  );
  const projectPath = useProjectPath();
  const params = useProjectParams();
  const instances = useRegisteredInstances<LiveCodeStudioInstance>(
    "@lqv/codemirror",
  ).filter((liveCode) => liveCode.name !== "saved-code-preview");
  const [state, dispatch] = useReducer(liveCodeReducer, {
    copyTarget: null,
    deleteTarget: null,
    error: null,
    overwriteTarget: null,
    previewTarget: null,
    renameTarget: null,
    renameValue: "",
    saved: [],
    selectedIndex: "0",
  });
  const {
    copyTarget,
    deleteTarget,
    error,
    overwriteTarget,
    previewTarget,
    renameTarget,
    renameValue,
    saved,
    selectedIndex,
  } = state;
  const instance = instances[Number(selectedIndex)] ?? instances[0];
  const files = useInstanceFiles(instance);

  useEffect(() => {
    if (Number(selectedIndex) >= instances.length) {
      dispatch({ kind: "selectedIndex", value: "0" });
    }
  }, [instances.length, selectedIndex]);

  useEffect(() => {
    listSaved(projectPath, params).then(
      (loaded) => dispatch({ kind: "saved", value: loaded }),
      (loadError: unknown) => {
        dispatch({
          kind: "error",
          value:
            loadError instanceof Error
              ? loadError.message
              : "Failed to load saved states",
        });
      },
    );
  }, [projectPath, params]);

  const projectSaved = saved
    .filter((state) => !state.isGlobal)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const globalSaved = saved
    .filter((state) => state.isGlobal)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const capture = async () => {
    if (!instance) {
      return;
    }
    try {
      const state = await saveState(
        projectPath,
        params,
        instance.getFiles(),
        projectSaved.length,
      );
      dispatch({ kind: "savedAdd", value: state });
    } catch (saveError) {
      dispatch({
        kind: "error",
        value:
          saveError instanceof Error
            ? saveError.message
            : "Failed to save state",
      });
    }
  };

  const refreshSaved = async () =>
    dispatch({ kind: "saved", value: await listSaved(projectPath, params) });

  const performOverwrite = async () => {
    if (!overwriteTarget || !instance) {
      return;
    }
    try {
      await overwriteState(
        projectPath,
        params,
        overwriteTarget.name,
        instance.getFiles(),
        overwriteTarget.isGlobal,
      );
      await refreshSaved();
      dispatch({ kind: "overwriteTarget", value: null });
      dispatch({ kind: "error", value: null });
    } catch (overwriteError) {
      dispatch({
        kind: "error",
        value:
          overwriteError instanceof Error
            ? overwriteError.message
            : t.errors.overwriteFailed,
      });
    }
  };

  const performRename = async () => {
    if (!renameTarget || !renameValue.trim()) {
      return;
    }
    try {
      await renameState(
        projectPath,
        params,
        renameTarget.name,
        renameValue.trim(),
        renameTarget.isGlobal,
      );
      await refreshSaved();
      dispatch({ kind: "renameTarget", value: null });
      dispatch({ kind: "error", value: null });
    } catch (renameError) {
      dispatch({
        kind: "error",
        value:
          renameError instanceof Error
            ? renameError.message
            : t.errors.renameFailed,
      });
    }
  };

  const performDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await deleteState(
        projectPath,
        params,
        deleteTarget.name,
        deleteTarget.isGlobal,
      );
      await refreshSaved();
      dispatch({ kind: "deleteTarget", value: null });
      dispatch({ kind: "error", value: null });
    } catch (deleteError) {
      dispatch({
        kind: "error",
        value:
          deleteError instanceof Error
            ? deleteError.message
            : t.errors.deleteFailed,
      });
    }
  };

  const performMakeGlobal = async (state: SavedState) => {
    try {
      await makeStateGlobal(projectPath, params, state.name);
      await refreshSaved();
      dispatch({ kind: "error", value: null });
    } catch (makeGlobalError) {
      dispatch({
        kind: "error",
        value:
          makeGlobalError instanceof Error
            ? makeGlobalError.message
            : t.errors.makeGlobalFailed,
      });
    }
  };

  return (
    <>
      <DockableDialog.Root closeOnEscape name="livecode" shortcut={shortcut}>
        <DockableDialog.Trigger asChild>
          <button
            {...stylex.props(styles.trigger)}
            title="LiveCode"
            type="button"
          >
            <CodeIcon size={22} />
          </button>
        </DockableDialog.Trigger>
        <DockableDialog.Dialog>
          <DockableDialog.Header>
            {PlainString("LiveCode")}
          </DockableDialog.Header>
          <DockableDialog.Content size="auto">
            <div {...stylex.props(styles.content)}>
              {instances.length > 1 && (
                <SelectRoot
                  onValueChange={(value) =>
                    dispatch({ kind: "selectedIndex", value: value as string })
                  }
                  value={selectedIndex}
                >
                  <SelectTrigger>
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectPositioner sideOffset={4}>
                      <SelectPopup>
                        <SelectList>
                          {instances.map((liveCode, index) => (
                            <SelectItem key={index} value={String(index)}>
                              <SelectItemText>
                                {PlainString(
                                  liveCode.name ??
                                    t.instance.replace(
                                      "{index}",
                                      String(index + 1),
                                    ),
                                )}
                              </SelectItemText>
                              <SelectItemIndicator />
                            </SelectItem>
                          ))}
                        </SelectList>
                      </SelectPopup>
                    </SelectPositioner>
                  </SelectPortal>
                </SelectRoot>
              )}
              <table {...stylex.props(styles.table)}>
                <caption {...stylex.props(styles.caption)}>{t.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" {...stylex.props(styles.header)}>
                      {t.headers.name}
                    </th>
                    <th scope="col" {...stylex.props(styles.header)}>
                      {t.headers.actions}
                    </th>
                  </tr>
                </thead>
                <SavedStateList
                  files={files}
                  globalStates={globalSaved}
                  instance={instance}
                  onCopy={(target) =>
                    dispatch({ kind: "copyTarget", value: target })
                  }
                  onDelete={(target) =>
                    dispatch({ kind: "deleteTarget", value: target })
                  }
                  onMakeGlobal={(target) => void performMakeGlobal(target)}
                  onOverwrite={(target) =>
                    dispatch({ kind: "overwriteTarget", value: target })
                  }
                  onPreview={(target) =>
                    dispatch({ kind: "previewTarget", value: target })
                  }
                  onRename={(target) =>
                    dispatch({
                      kind: "rename",
                      target,
                      value: target.name,
                    })
                  }
                  projectStates={projectSaved}
                  t={t}
                />
              </table>
              {error && (
                <p role="alert" {...stylex.props(styles.error)}>
                  {error}
                </p>
              )}
              <Button
                disabled={!instance}
                kind="primary"
                onClick={() => void capture()}
              >
                {t.capture}
              </Button>
            </div>
          </DockableDialog.Content>
        </DockableDialog.Dialog>
      </DockableDialog.Root>

      <CodePreview
        onClose={() => dispatch({ kind: "previewTarget", value: null })}
        savedState={previewTarget}
      />

      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "copyTarget", value: null })
        }
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

      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "renameTarget", value: null })
        }
        open={!!renameTarget}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup size="auto">
            <DialogTitle>{t.rename}</DialogTitle>
            <DialogClose />
            <TextField
              label={t.newName}
              onChange={(value) => dispatch({ kind: "renameValue", value })}
              onKeyDown={(event) =>
                event.key === "Enter" && void performRename()
              }
              value={renameValue}
            />
            <DialogActions>
              <Button
                disabled={!renameValue.trim()}
                onClick={() => void performRename()}
              >
                {t.rename}
              </Button>
            </DialogActions>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>

      <AlertDialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "overwriteTarget", value: null })
        }
        open={!!overwriteTarget}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="auto">
            <AlertDialogTitle>{t.overwrite}</AlertDialogTitle>
            <AlertDialogClose />
            <p>
              {PlainString(
                `Overwrite “${overwriteTarget?.name}” with the selected LiveCode instance?`,
              )}
            </p>
            <AlertDialogActions>
              <Button
                disabled={!instance}
                kind="destructive"
                onClick={() => void performOverwrite()}
              >
                {t.overwrite}
              </Button>
            </AlertDialogActions>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialogRoot>

      <AlertDialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "deleteTarget", value: null })
        }
        open={!!deleteTarget}
      >
        <AlertDialogPortal>
          <AlertDialogBackdrop />
          <AlertDialogPopup size="auto">
            <AlertDialogTitle>{t.delete}</AlertDialogTitle>
            <AlertDialogClose />
            <p>
              {PlainString(
                `Delete “${deleteTarget?.name}”? This action cannot be undone.`,
              )}
            </p>
            <AlertDialogActions>
              <Button kind="destructive" onClick={() => void performDelete()}>
                {t.delete}
              </Button>
            </AlertDialogActions>
          </AlertDialogPopup>
        </AlertDialogPortal>
      </AlertDialogRoot>
    </>
  );
}
