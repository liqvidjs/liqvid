"use client";

import {
  Button,
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
} from "@liqvid/studio/ui";
import {
  colors,
  spacing,
  text,
  typeface,
} from "@liqvid/studio/ui/design-tokens.stylex.ts";
import {
  CodeIcon,
  PencilSimpleIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useState } from "react";

import type { LiveCodeStudioInstance } from "../components/Root.tsx";
import { getFileType } from "../utils.ts";

import type { getTranslations } from "./server.ts";
import type { SavedState } from "./types.ts";

type T = Awaited<ReturnType<typeof getTranslations>>;

const styles = stylex.create({
  actions: { alignItems: "center", display: "flex", gap: spacing.sm },
  cell: { paddingBlock: spacing.sm, paddingInline: spacing.md },
  fileList: {
    listStyle: "none",
    margin: spacing.zero,
    paddingInlineStart: spacing.xl,
  },
  filename: { fontFamily: typeface.mono, fontSize: text.sm },
  fileRow: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
    paddingBlock: spacing.sm,
  },
  header: {
    color: colors.secondary,
    fontSize: text.sm,
    fontWeight: "bold",
    paddingBlock: spacing.md,
    textAlign: "left",
  },
  name: {
    fontFamily: typeface.mono,
    fontWeight: "normal",
    paddingInline: spacing.md,
    textAlign: "left",
  },
  restore: {
    alignItems: "center",
    display: "flex",
    gap: spacing.sm,
    marginLeft: "auto",
  },
  section: { listStyle: "none", margin: spacing.zero, padding: spacing.zero },
  warning: { color: "#aaa", cursor: "help" },
});

export function SavedStateList({
  files,
  globalStates,
  instance,
  onCopy,
  onDelete,
  onMakeGlobal,
  onOverwrite,
  onPreview,
  onRename,
  projectStates,
  t,
}: {
  files: Readonly<Record<string, string>>;
  globalStates: readonly SavedState[];
  instance: LiveCodeStudioInstance | undefined;
  onCopy: (state: SavedState) => void;
  onDelete: (state: SavedState) => void;
  onMakeGlobal: (state: SavedState) => void;
  onOverwrite: (state: SavedState) => void;
  onPreview: (state: SavedState) => void;
  onRename: (state: SavedState) => void;
  projectStates: readonly SavedState[];
  t: T;
}) {
  return (
    <tbody>
      <tr>
        <th colSpan={2} {...stylex.props(styles.header)}>
          {t.projectStates}
        </th>
      </tr>
      {projectStates.map((state) => (
        <SavedStateRow
          files={files}
          instance={instance}
          key={`project:${state.name}`}
          onCopy={onCopy}
          onDelete={onDelete}
          onMakeGlobal={onMakeGlobal}
          onOverwrite={onOverwrite}
          onPreview={onPreview}
          onRename={onRename}
          state={state}
          t={t}
        />
      ))}
      <tr>
        <th colSpan={2} {...stylex.props(styles.header)}>
          {t.globalStates}
        </th>
      </tr>
      {globalStates.map((state) => (
        <SavedStateRow
          files={files}
          instance={instance}
          key={`global:${state.name}`}
          onCopy={onCopy}
          onDelete={onDelete}
          onMakeGlobal={onMakeGlobal}
          onOverwrite={onOverwrite}
          onPreview={onPreview}
          onRename={onRename}
          state={state}
          t={t}
        />
      ))}
    </tbody>
  );
}

function SavedStateRow({
  files,
  instance,
  onCopy,
  onDelete,
  onMakeGlobal,
  onOverwrite,
  onPreview,
  onRename,
  state,
  t,
}: {
  files: Readonly<Record<string, string>>;
  instance: LiveCodeStudioInstance | undefined;
  onCopy: (state: SavedState) => void;
  onDelete: (state: SavedState) => void;
  onMakeGlobal: (state: SavedState) => void;
  onOverwrite: (state: SavedState) => void;
  onPreview: (state: SavedState) => void;
  onRename: (state: SavedState) => void;
  state: SavedState;
  t: T;
}) {
  const [expanded, setExpanded] = useState(false);
  const names = Object.keys(state.files);
  const missingNames = names.filter(
    (filename) => !Object.hasOwn(files, filename),
  );
  const canRestoreAny = names.some((filename) =>
    Object.hasOwn(files, filename),
  );

  return (
    <>
      <tr>
        <th scope="row" {...stylex.props(styles.name)}>
          <Button
            aria-expanded={expanded}
            kind="ghost"
            onClick={() => setExpanded((previous) => !previous)}
            size="small"
          >
            {PlainString(state.name)}
          </Button>
        </th>
        <td {...stylex.props(styles.cell)}>
          <div {...stylex.props(styles.actions)}>
            <Button
              onClick={() => onPreview(state)}
              size="small"
              title={t.preview}
            >
              <CodeIcon aria-hidden="true" />
              {t.preview}
            </Button>
            <div {...stylex.props(styles.restore)}>
              {missingNames.length > 0 && (
                <span
                  {...stylex.props(styles.warning)}
                  title={`Some files cannot be restored: ${missingNames.join(", ")}`}
                >
                  <WarningIcon aria-label={missingNames.join(", ")} size={16} />
                </span>
              )}
              <Button
                disabled={!instance || !canRestoreAny}
                onClick={() => restoreIntersection(state, files, instance)}
                size="small"
              >
                {t.restore}
              </Button>
            </div>
            <Button
              disabled={!instance}
              onClick={() => onOverwrite(state)}
              size="small"
              title={t.overwrite}
            >
              {t.overwrite}
            </Button>
            <Button onClick={() => onCopy(state)} size="small" title={t.copy}>
              {t.copy}
            </Button>
            <Button
              aria-label={t.rename}
              onClick={() => onRename(state)}
              size="small"
              title={t.rename}
            >
              <PencilSimpleIcon aria-hidden="true" />
            </Button>
            <Button
              aria-label={t.delete}
              kind="destructive"
              onClick={() => onDelete(state)}
              size="small"
              title={t.delete}
            >
              <TrashIcon aria-hidden="true" />
            </Button>
            {!state.isGlobal && (
              <Button onClick={() => onMakeGlobal(state)} size="small">
                {t.makeGlobal}
              </Button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={2} {...stylex.props(styles.cell)}>
            <ul {...stylex.props(styles.fileList)}>
              {Object.entries(state.files).map(([filename, content]) => (
                <li key={filename} {...stylex.props(styles.fileRow)}>
                  <span {...stylex.props(styles.filename)}>{filename}</span>
                  <SavedFileRestoreControl
                    content={content}
                    filename={filename}
                    files={files}
                    instance={instance}
                    t={t}
                  />
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function SavedFileRestoreControl({
  content,
  files,
  filename,
  instance,
  t,
}: {
  content: string;
  files: Readonly<Record<string, string>>;
  filename: string;
  instance: LiveCodeStudioInstance | undefined;
  t: T;
}) {
  const [selectedTarget, setSelectedTarget] = useState<string>();
  const exact = Object.hasOwn(files, filename);
  const matchingFiles = Object.keys(files).filter(
    (target) =>
      getFileType(target).toLowerCase() === getFileType(filename).toLowerCase(),
  );
  const target = exact
    ? filename
    : matchingFiles.includes(selectedTarget ?? "")
      ? selectedTarget
      : matchingFiles[0];

  if (exact) {
    return (
      <Button
        disabled={!instance}
        onClick={() => instance?.restoreFile(filename, content)}
        size="small"
      >
        {t.restore}
      </Button>
    );
  }
  if (matchingFiles.length === 1) {
    return (
      <Button
        disabled={!instance}
        onClick={() => instance?.restoreFile(matchingFiles[0]!, content)}
        size="small"
      >
        {PlainString(`Restore to ${matchingFiles[0]}`)}
      </Button>
    );
  }
  if (matchingFiles.length > 1) {
    return (
      <>
        <span>{t.restoreTo}</span>
        <SelectRoot
          onValueChange={(value) => setSelectedTarget(value as string)}
          value={target ?? ""}
        >
          <SelectTrigger size="small">
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectPortal>
            <SelectPositioner sideOffset={4}>
              <SelectPopup>
                <SelectList>
                  {matchingFiles.map((targetFile) => (
                    <SelectItem key={targetFile} value={targetFile}>
                      <SelectItemText>{PlainString(targetFile)}</SelectItemText>
                      <SelectItemIndicator />
                    </SelectItem>
                  ))}
                </SelectList>
              </SelectPopup>
            </SelectPositioner>
          </SelectPortal>
        </SelectRoot>
        <Button
          disabled={!instance || !target}
          onClick={() => target && instance?.restoreFile(target, content)}
          size="small"
        >
          {t.restore}
        </Button>
      </>
    );
  }
  return <span>{t.noMatchingFile}</span>;
}

function restoreIntersection(
  state: SavedState,
  files: Readonly<Record<string, string>>,
  instance: LiveCodeStudioInstance | undefined,
): void {
  if (!instance) {
    return;
  }
  for (const [filename, content] of Object.entries(state.files)) {
    if (Object.hasOwn(files, filename)) {
      instance.restoreFile(filename, content);
    }
  }
}
