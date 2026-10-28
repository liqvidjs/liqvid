"use client";

import type { Duration } from "@liqvid/duration";
import type {
  ParameterValues,
  ProjectMeta,
  ScreenshotEntry,
} from "@liqvid/schemas";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import {
  CopyIcon,
  FolderOpenIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { useEffect, useEffectEvent, useReducer } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client";
import { colors, dims, rounded, spacing, text } from "#_/design/tokens.stylex";
import { type LocalizedString, PlainString } from "#_/i18n/shared";
import { openScreenshotInFinderAction } from "#_/pages/root-actions";
import {
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from "#_/ui/AlertDialog";
import { Button } from "#_/ui/Button";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "#_/ui/Dialog";
import { useDialogApi } from "#_/ui/dialogs-shared";
import { Spinner } from "#_/ui/Spinner";
import { TextField } from "#_/ui/TextField";
import { Time } from "#_/ui/Time";
import { useTranslations } from "#_/utils/react";

import { ScreenshotModal } from "./ScreenshotModal.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export type { T as TranslationsScreenshotsSection };

interface ScreenshotsSectionProps {
  basePath: string;
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;

  /** Selected parameter values for parameterized projects */
  selectedParams?: ParameterValues;
}

type ConfirmState = {
  screenshotId: string;
  target: CopyTarget;
  variant?: LocalizedString;
};

type CopyTarget = "opengraph-image.png" | "twitter-image.png";

const styles = stylex.create({
  actions: {
    display: "flex",
    flexShrink: 0,
    gap: spacing.sm,
  },
  confirmMessage: {
    color: colors.grayDim,
    fontSize: text.md,
    marginBlock: spacing.xl,
    marginInline: spacing.zero,
  },
  created: {
    color: colors.grayDim,
    fontSize: text.sm,
  },
  dialogActions: {
    columnGap: spacing.lg,
    display: "flex",
    justifyContent: "flex-end",
    marginTop: spacing.lg,
    rowGap: spacing.lg,
  },
  dimensions: {
    color: colors.grayDim,
    fontSize: text.sm,
  },
  emptyMessage: {
    color: colors.grayDim,
    fontSize: text.md,
    padding: spacing.xl,
    textAlign: "center",
  },
  fieldError: {
    color: colors.errorText,
    fontSize: text.md,
  },
  filename: {
    backgroundColor: colors.graySubtle,
    borderRadius: rounded.sm,
    fontSize: text.md,
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
  },
  formField: {
    columnGap: spacing.lg,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.lg,
  },
  info: {
    columnGap: spacing.sm,
    display: "flex",
    flex: "1",
    flexDirection: "column",
    minWidth: 0,
    rowGap: spacing.sm,
  },
  item: {
    alignItems: "center",
    backgroundColor: colors.grayApp,
    borderColor: colors.graySep,
    borderRadius: rounded.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    gap: spacing.lg,
    padding: spacing.md,
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.lg,
    listStyle: "none",
    margin: spacing.zero,
    maxHeight: "300px",
    overflowY: "auto",
    padding: spacing.zero,
  },
  loading: {
    alignItems: "center",
    display: "flex",
    justifyContent: "center",
    padding: spacing.xl,
  },
  previewImage: {
    borderRadius: rounded.md,
    display: "block",
    height: "auto",
    width: "100%",
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionActions: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
    justifyContent: "flex-end",
    marginBottom: spacing.lg,
  },
  thumbnail: {
    borderRadius: rounded.md,
    height: "48px",
    objectFit: "cover",
    width: "80px",
  },
  thumbnailButton: {
    backgroundColor: colors.transparent,
    borderRadius: rounded.md,
    borderStyle: "none",
    cursor: "pointer",
    outlineColor: colors.accentSolid,
    outlineOffset: {
      ":focus-visible": "2px",
      default: null,
    },
    outlineStyle: {
      ":focus-visible": "solid",
      default: null,
    },
    outlineWidth: dims.ring,
    padding: spacing.zero,
  },
  title: {
    fontSize: text.md,
  },
});

const sxStyles = stylex.create({
  previewPopup: {
    maxWidth: "90vw",
    width: "90vw",
  },
});

async function copyScreenshot(
  projectPath: RelativeDir,
  screenshotId: string,
  target: CopyTarget,
  variant: LocalizedString | undefined,
  params: string,
) {
  try {
    await clientRuntime.runPromise(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        yield* client.screenshots.copy({
          payload: {
            screenshotId,
            sourceFilename: variant
              ? (`${variant.toLowerCase()}.png` as "light.png" | "dark.png")
              : undefined,
            targetFilename: target,
          },
          query: {
            params,
            projectPath,
          },
        });
      }),
    );
  } catch (e) {
    console.error("Failed to copy screenshot:", e);
  }
}

interface ScreenshotItemProps {
  /** Whether this is the first variant of the screenshot */
  isPrimary: boolean;
  /** Ask the parent to confirm overwriting an existing target file */
  onConfirmOverwrite: (
    screenshotId: string,
    target: CopyTarget,
    variant?: LocalizedString,
  ) => void;
  onDelete: (screenshotId: string) => void;
  /** Open a full-size preview of the given image src */
  onPreview: (src: string, alt: string) => void;
  onRename: (screenshotId: string) => void;
  parameterValues?: ParameterValues;
  params: string;
  screenshot: ScreenshotEntry;
  variant: { label?: LocalizedString; path: string };
}

function ScreenshotItem({
  screenshot,
  variant,
  isPrimary,
  onConfirmOverwrite,
  onRename,
  onDelete,
  onPreview,
  params,
  parameterValues,
}: ScreenshotItemProps) {
  const t = useTranslations<{ screenshots: T }>().screenshots.item;
  const projectPath = useProjectPath();

  const handleCopyAs = async (target: CopyTarget) => {
    try {
      const { exists } = await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          return yield* client.screenshots.checkExists({
            query: { filename: target, projectPath },
          });
        }),
      );

      if (exists) {
        onConfirmOverwrite(screenshot.id, target, variant.label);
        return;
      }
    } catch (e) {
      console.error("Failed to check image existence:", e);
    }

    await copyScreenshot(
      projectPath,
      screenshot.id,
      target,
      variant.label,
      params,
    );
  };

  const handleOpenInFinder = async () => {
    await openScreenshotInFinderAction(
      projectPath,
      screenshot.id,
      parameterValues,
    );
  };

  const alt = `Screenshot from ${screenshot.meta.createdAt}${variant.label ? ` (${variant.label})` : ""}`;
  const src = `/api/liqvid/static/${`/${projectPath}/${variant.path}`}`;

  return (
    <li sx={styles.item}>
      {/** biome-ignore lint/correctness/noRestrictedElements: only a button for accessibililty purposes */}
      <button
        onClick={() => onPreview(src, alt)}
        sx={styles.thumbnailButton}
        title={t.viewFullSize}
        type="button"
      >
        <img alt={alt} src={src} sx={styles.thumbnail} />
      </button>
      <div sx={styles.info}>
        <span sx={styles.title}>
          {screenshot.id ||
            new Date(screenshot.meta.createdAt).toLocaleString()}
          {variant.label && ` (${variant.label})`}
        </span>
        <span sx={styles.created}>
          <Time format="long" value={screenshot.meta.createdAt} />
        </span>
        <span sx={styles.dimensions}>
          {screenshot.meta.width}
          {" x "}
          {screenshot.meta.height}
        </span>
      </div>
      <div sx={styles.actions}>
        <Button
          onClick={() => handleCopyAs("opengraph-image.png")}
          title={t.useOpenGraph}
        >
          <CopyIcon size={14} />
          {PlainString(" OG")}
        </Button>
        <Button
          onClick={() => handleCopyAs("twitter-image.png")}
          title={t.useTwitter}
        >
          <CopyIcon size={14} />
          {PlainString(" Twitter")}
        </Button>
        {isPrimary && (
          <>
            <Button onClick={handleOpenInFinder} title={t.openInFinder}>
              <FolderOpenIcon size={14} />
            </Button>
            <Button onClick={() => onRename(screenshot.id)} title={t.rename}>
              <PencilSimpleIcon size={14} />
            </Button>
            <Button onClick={() => onDelete(screenshot.id)} title={t.delete}>
              <TrashIcon size={14} />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

type ScreenshotsState = {
  confirmDialog: ConfirmState | null;
  deleteDialog: { screenshotId: string } | null;
  isLoading: boolean;
  previewDialog: { src: string; alt: string } | null;
  renameDialog: { screenshotId: string } | null;
  renameError: string | null;
  renameValue: string;
  screenshots: readonly ScreenshotEntry[];
};

type ScreenshotsAction =
  | { kind: "confirmDialog"; value: ConfirmState | null }
  | { kind: "deleteDialog"; value: { screenshotId: string } | null }
  | { kind: "loading"; value: boolean }
  | {
      kind: "previewDialog";
      value: { src: string; alt: string } | null;
    }
  | { kind: "renameDialog"; value: { screenshotId: string } | null }
  | { kind: "renameError"; value: string | null }
  | { kind: "renameOpen"; value: string }
  | { kind: "renameValue"; value: string }
  | { kind: "screenshots"; value: readonly ScreenshotEntry[] };

function screenshotsReducer(
  state: ScreenshotsState,
  action: ScreenshotsAction,
): ScreenshotsState {
  switch (action.kind) {
    case "confirmDialog": {
      return { ...state, confirmDialog: action.value };
    }
    case "deleteDialog": {
      return { ...state, deleteDialog: action.value };
    }
    case "loading": {
      return { ...state, isLoading: action.value };
    }
    case "previewDialog": {
      return { ...state, previewDialog: action.value };
    }
    case "renameDialog": {
      return { ...state, renameDialog: action.value };
    }
    case "renameError": {
      return { ...state, renameError: action.value };
    }
    case "renameOpen": {
      return {
        ...state,
        renameDialog: { screenshotId: action.value },
        renameError: null,
        renameValue: action.value,
      };
    }
    case "renameValue": {
      return { ...state, renameValue: action.value };
    }
    case "screenshots": {
      return { ...state, screenshots: action.value };
    }
  }
}

export function ScreenshotsSection({
  basePath,
  duration,
  project,
  selectedParams,
}: ScreenshotsSectionProps) {
  const { screenshots: t } = useTranslations<{ screenshots: T }>();
  const { isOpen } = useDialogApi();

  const [state, dispatch] = useReducer(screenshotsReducer, {
    confirmDialog: null,
    deleteDialog: null,
    isLoading: false,
    previewDialog: null,
    renameDialog: null,
    renameError: null,
    renameValue: "",
    screenshots: [],
  });
  const {
    confirmDialog,
    deleteDialog,
    isLoading,
    previewDialog,
    renameDialog,
    renameError,
    renameValue,
    screenshots,
  } = state;

  const projectPath = project.path;

  // Serialize params for use as dependency
  const paramsJson = JSON.stringify(selectedParams ?? {});

  const loadScreenshots = async () => {
    dispatch({ kind: "loading", value: true });

    await clientRuntime.runPromise(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        const screenshots = yield* client.screenshots.list({
          query: {
            params: paramsJson,
            projectPath,
          },
        });

        dispatch({ kind: "screenshots", value: screenshots });
      }),
    );

    dispatch({ kind: "loading", value: false });
  };

  const loadScreenshots$ = useEffectEvent(loadScreenshots);

  useEffect(() => {
    if (isOpen) {
      // TODO: this is ugly
      // (need to reload content when selectedParams changes)
      selectedParams;
      queueMicrotask(loadScreenshots$);
    }
  }, [isOpen, selectedParams]);

  const openRenameDialog = (screenshotId: string) => {
    dispatch({ kind: "renameOpen", value: screenshotId });
  };

  return (
    <>
      <div sx={styles.section}>
        <DialogRoot>
          <div sx={styles.sectionActions}>
            <DialogTrigger>
              <PlusIcon size={16} /> {t.trigger}
            </DialogTrigger>
          </div>
          <ScreenshotModal
            basePath={basePath}
            duration={duration}
            onCaptured={loadScreenshots}
            project={project}
            selectedParams={selectedParams}
          />
        </DialogRoot>

        {isLoading ? (
          <div sx={styles.loading}>
            <Spinner size={24} />
          </div>
        ) : screenshots.length === 0 ? (
          <p sx={styles.emptyMessage}>{t.empty}</p>
        ) : (
          <ul sx={styles.list}>
            {screenshots.map((screenshot) => {
              const { imagePath } = screenshot;
              const variants =
                typeof imagePath === "object"
                  ? ([
                      { label: t.colorScheme.light, path: imagePath.light },
                      { label: t.colorScheme.dark, path: imagePath.dark },
                    ] as const)
                  : ([{ label: undefined, path: imagePath }] as const);

              return variants.map((variant, variantIndex) => (
                <ScreenshotItem
                  isPrimary={variantIndex === 0}
                  key={`${screenshot.id}-${variant.label ?? "single"}`}
                  onConfirmOverwrite={(screenshotId, target, label) =>
                    dispatch({
                      kind: "confirmDialog",
                      value: { screenshotId, target, variant: label },
                    })
                  }
                  onDelete={(screenshotId) =>
                    dispatch({
                      kind: "deleteDialog",
                      value: { screenshotId },
                    })
                  }
                  onPreview={(src, alt) =>
                    dispatch({ kind: "previewDialog", value: { alt, src } })
                  }
                  onRename={openRenameDialog}
                  parameterValues={selectedParams}
                  params={paramsJson}
                  screenshot={screenshot}
                  variant={variant}
                />
              ));
            })}
          </ul>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "confirmDialog", value: null })
        }
        open={!!confirmDialog}
      >
        <ConfirmationDialog
          {...{
            confirmDialog,
            onClose: () => dispatch({ kind: "confirmDialog", value: null }),
            params: paramsJson,
          }}
        />
      </AlertDialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "renameDialog", value: null })
        }
        open={!!renameDialog}
      >
        <DialogPortal>
          <DialogBackdrop forceRender />
          <RenameDialog
            {...{
              loadScreenshots,
              onClose: () => dispatch({ kind: "renameDialog", value: null }),
              onRenameErrorChange: (value: string | null) =>
                dispatch({ kind: "renameError", value }),
              onRenameValueChange: (value: string) =>
                dispatch({ kind: "renameValue", value }),
              params: paramsJson,
              renameDialog,
              renameError,
              renameValue,
            }}
          />
        </DialogPortal>
      </DialogRoot>

      {/* Delete Dialog */}
      <AlertDialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "deleteDialog", value: null })
        }
        open={!!deleteDialog}
      >
        <DeleteDialog
          {...{
            deleteDialog,
            loadScreenshots,
            onClose: () => dispatch({ kind: "deleteDialog", value: null }),
            params: paramsJson,
          }}
        />
      </AlertDialogRoot>

      {/* Preview Dialog */}
      <DialogRoot
        onOpenChange={(open) =>
          !open && dispatch({ kind: "previewDialog", value: null })
        }
        open={!!previewDialog}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup style={sxStyles.previewPopup}>
            <DialogClose />
            {previewDialog && (
              <img
                alt={previewDialog.alt}
                src={previewDialog.src}
                sx={styles.previewImage}
              />
            )}
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}

function ConfirmationDialog({
  confirmDialog,
  onClose,
  params,
}: {
  confirmDialog: ConfirmState | null;
  onClose: () => void;
  params: string;
}) {
  const t = useTranslations<{ screenshots: T }>().screenshots.confirmDialog;
  const projectPath = useProjectPath();

  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop forceRender />
      <AlertDialogPopup>
        <AlertDialogTitle>{t.title}</AlertDialogTitle>
        <p sx={styles.confirmMessage}>
          {t.message({
            filename: <code sx={styles.filename}>{confirmDialog?.target}</code>,
          })}
        </p>
        <div sx={styles.dialogActions}>
          <AlertDialogClose />
          <Button
            onClick={() => {
              if (confirmDialog) {
                copyScreenshot(
                  projectPath,
                  confirmDialog.screenshotId,
                  confirmDialog.target,
                  confirmDialog.variant,
                  params,
                );
                onClose();
              }
            }}
          >
            {t.action}
          </Button>
        </div>
      </AlertDialogPopup>
    </AlertDialogPortal>
  );
}

function RenameDialog({
  loadScreenshots,
  onClose,
  onRenameErrorChange,
  onRenameValueChange,
  params,
  renameDialog,
  renameError,
  renameValue,
}: {
  loadScreenshots: () => Promise<void>;
  onClose: () => void;
  onRenameErrorChange: (error: string | null) => void;
  onRenameValueChange: (value: string) => void;
  params: string;
  renameDialog: { screenshotId: string } | null;
  renameError: string | null;
  renameValue: string;
}) {
  const t = useTranslations<{ screenshots: T }>().screenshots.renameDialog;
  const projectPath = useProjectPath();

  const performRename = async () => {
    if (!renameDialog) {
      return;
    }

    const newName = renameValue.trim();
    if (!newName) {
      onRenameErrorChange("Name is required");
      return;
    }

    try {
      await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.screenshots.rename({
            payload: { newName, screenshotId: renameDialog.screenshotId },
            query: { params, projectPath },
          });
        }),
      );

      onClose();
      await loadScreenshots();
    } catch (e) {
      onRenameErrorChange("Failed to rename screenshot");
      console.error("Failed to rename screenshot:", e);
    }
  };

  return (
    <DialogPopup>
      <DialogTitle>{t.title}</DialogTitle>
      <div sx={styles.formField}>
        <TextField
          label={t.newName}
          onChange={(value) => {
            onRenameValueChange(value);
            onRenameErrorChange(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              performRename();
            }
          }}
          value={renameValue}
        />
        {renameError && <span sx={styles.fieldError}>{renameError}</span>}
      </div>
      <div sx={styles.dialogActions}>
        <DialogClose />
        <Button onClick={() => performRename()}>{t.action}</Button>
      </div>
    </DialogPopup>
  );
}

function DeleteDialog({
  deleteDialog,
  loadScreenshots,
  onClose,
  params,
}: {
  deleteDialog: { screenshotId: string } | null;
  loadScreenshots: () => Promise<void>;
  onClose: () => void;
  params: string;
}) {
  const t = useTranslations<{ screenshots: T }>().screenshots.deleteDialog;
  const projectPath = useProjectPath();

  const performDelete = async () => {
    if (!deleteDialog) {
      return;
    }

    try {
      await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.screenshots.delete({
            payload: { screenshotId: deleteDialog.screenshotId },
            query: { params, projectPath },
          });
        }),
      );

      onClose();
      await loadScreenshots();
    } catch (e) {
      console.error("Failed to delete screenshot:", e);
    }
  };

  return (
    <AlertDialogPortal>
      <AlertDialogBackdrop forceRender />
      <AlertDialogPopup>
        <AlertDialogTitle>{t.title}</AlertDialogTitle>
        <p sx={styles.confirmMessage}>{t.confirm}</p>
        <div sx={styles.dialogActions}>
          <AlertDialogClose />
          <Button kind="destructive" onClick={() => performDelete()}>
            {t.action}
          </Button>
        </div>
      </AlertDialogPopup>
    </AlertDialogPortal>
  );
}
