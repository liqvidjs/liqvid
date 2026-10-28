"use client";

import type { ParameterValues } from "@liqvid/schemas";
import {
  type CopySavedStateDialogLabels,
  CopySavedStateDialog as SharedCopySavedStateDialog,
} from "@liqvid/studio/ui";
import type { RelativeDir } from "effect-paths";

import type { getTranslations } from "./server.ts";
import { copyStateToProject, listWorkspaceProjects } from "./server.ts";
import type { SavedState } from "./types.ts";

type T = Awaited<ReturnType<typeof getTranslations>>;

export function CopySavedStateDialog({
  currentParams,
  currentProjectPath,
  onClose,
  open,
  savedState,
  t,
}: {
  currentParams: ParameterValues;
  currentProjectPath: RelativeDir;
  onClose: () => void;
  open: boolean;
  savedState: SavedState | null;
  t: T;
}) {
  if (!savedState) {
    return null;
  }
  const labels: CopySavedStateDialogLabels = {
    cancel: t.cancel,
    copy: t.copy,
    copyFailed: t.errors.copyFailed,
    copySavedState: t.copySavedState,
    loadingProjects: t.loadingProjects,
    noMatchingProjects: t.noMatchingProjects,
    parameters: t.parameters,
    searchProjects: t.searchProjects,
    workspaceProjects: t.workspaceProjects,
  };
  return (
    <SharedCopySavedStateDialog
      currentParams={currentParams}
      currentProjectPath={currentProjectPath}
      labels={labels}
      loadProjects={listWorkspaceProjects}
      onClose={onClose}
      onCopy={(targetPath, targetParams) =>
        copyStateToProject(
          currentProjectPath,
          currentParams,
          targetPath,
          targetParams,
          savedState.name,
          savedState.isGlobal,
        )
      }
      open={open}
    />
  );
}
