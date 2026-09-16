"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta, ScreenshotEntry } from "@liqvid/schemas";
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
import { useCallback, useEffect, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "#_/client.mjs";
import { Spinner } from "#_/components/Spinner.js";
import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import { PlainString } from "#_/i18n/shared.mjs";
import { openScreenshotInFinderAction } from "#_/pages/root-actions.js";
import {
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogPopup,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle,
} from "#_/ui/AlertDialog.js";
import { Button } from "#_/ui/Button.js";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "#_/ui/Dialog.js";
import { useDialogApi } from "#_/ui/dialogs-shared.js";
import { TextField } from "#_/ui/TextField.js";
import { Time } from "#_/ui/Time.js";
import { useTranslations } from "#_/utils/react.js";

import { ScreenshotModal } from "./ScreenshotModal.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export type { T as TranslationsScreenshotsSection };

interface ScreenshotsSectionProps {
  basePath: string;
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;

  /** Selected parameter values for parameterized projects */
  selectedParams?: Readonly<Record<string, string>>;
}

type ConfirmState = {
  screenshotId: string;
  target: CopyTarget;
  variant?: VariantLabel;
};

type CopyTarget = "opengraph-image.png" | "twitter-image.png";
type VariantLabel = "Light" | "Dark" | null;

const styles = stylex.create({
  actions: {
    display: "flex",
    flexShrink: 0,
    gap: spacing.sm,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: {
      ":disabled": colors.graySubtle,
      ":hover": colors.grayHover,
      default: colors.graySubtle,
    },
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: {
      ":disabled": colors.grayDim,
      default: colors.grayNormal,
    },
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: text.md,
    gap: spacing.xs,
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
    transition: "background-color 0.15s",
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
    borderRadius: radii.sm,
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
    borderRadius: radii.lg,
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
    borderRadius: radii.md,
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
    borderRadius: radii.md,
    height: "48px",
    objectFit: "cover",
    width: "80px",
  },
  thumbnailButton: {
    backgroundColor: colors.transparent,
    borderRadius: radii.md,
    borderStyle: "none",
    cursor: "pointer",
    outline: {
      ":focus-visible": "2px solid var(--accent, #4f8cff)",
      default: null,
    },
    outlineOffset: {
      ":focus-visible": "2px",
      default: null,
    },
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
  variant?: VariantLabel,
  params?: string,
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
    variant?: VariantLabel,
  ) => void;
  onDelete: (screenshotId: string) => void;
  /** Open a full-size preview of the given image src */
  onPreview: (src: string, alt: string) => void;
  onRename: (screenshotId: string) => void;
  params?: string;
  parameterValues?: Readonly<Record<string, string>>;
  screenshot: ScreenshotEntry;
  variant: { label: VariantLabel; path: string };
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

export function ScreenshotsSection({
  basePath,
  duration,
  project,
  selectedParams,
}: ScreenshotsSectionProps) {
  const { screenshots: t } = useTranslations<{ screenshots: T }>();
  const { isOpen } = useDialogApi();

  const [screenshots, setScreenshots] = useState<readonly ScreenshotEntry[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    screenshotId: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    screenshotId: string;
  } | null>(null);
  const [previewDialog, setPreviewDialog] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  const projectPath = project.path;

  // Serialize params for use as dependency
  const paramsJson = selectedParams
    ? JSON.stringify(selectedParams)
    : undefined;

  const loadScreenshots = useCallback(async () => {
    setIsLoading(true);

    await clientRuntime.runPromise(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        const screenshots = yield* client.screenshots.list({
          query: {
            params: paramsJson,
            projectPath,
          },
        });

        setScreenshots(screenshots);
      }),
    );

    setIsLoading(false);
  }, [paramsJson, projectPath]);

  useEffect(() => {
    if (isOpen) {
      loadScreenshots();
    }
  }, [isOpen, loadScreenshots]);

  const openRenameDialog = (screenshotId: string) => {
    setRenameValue(screenshotId);
    setRenameError(null);
    setRenameDialog({ screenshotId });
  };

  return (
    <>
      <div sx={styles.section}>
        <DialogRoot>
          <div sx={styles.sectionActions}>
            <DialogTrigger {...stylex.props(styles.addButton)}>
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
                      { label: "Light", path: imagePath.light },
                      { label: "Dark", path: imagePath.dark },
                    ] as const)
                  : ([{ label: null, path: imagePath }] as const);

              return variants.map((variant, variantIndex) => (
                <ScreenshotItem
                  isPrimary={variantIndex === 0}
                  key={`${screenshot.id}-${variant.label ?? "single"}`}
                  onConfirmOverwrite={(screenshotId, target, label) =>
                    setConfirmDialog({ screenshotId, target, variant: label })
                  }
                  onDelete={(screenshotId) => setDeleteDialog({ screenshotId })}
                  onPreview={(src, alt) => setPreviewDialog({ alt, src })}
                  onRename={openRenameDialog}
                  params={paramsJson}
                  parameterValues={selectedParams}
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
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        open={!!confirmDialog}
      >
        <ConfirmationDialog
          {...{ confirmDialog, params: paramsJson, setConfirmDialog }}
        />
      </AlertDialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setRenameDialog(null)}
        open={!!renameDialog}
      >
        <DialogPortal>
          <DialogBackdrop forceRender />
          <RenameDialog
            {...{
              loadScreenshots,
              params: paramsJson,
              renameDialog,
              renameError,
              renameValue,
              setRenameDialog,
              setRenameError,
              setRenameValue,
            }}
          />
        </DialogPortal>
      </DialogRoot>

      {/* Delete Dialog */}
      <AlertDialogRoot
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        open={!!deleteDialog}
      >
        <DeleteDialog
          {...{
            deleteDialog,
            loadScreenshots,
            params: paramsJson,
            setDeleteDialog,
          }}
        />
      </AlertDialogRoot>

      {/* Preview Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setPreviewDialog(null)}
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
  params,
  setConfirmDialog,
}: {
  confirmDialog: ConfirmState | null;
  params?: string;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmState | null>>;
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
                setConfirmDialog(null);
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
  params,
  renameDialog,
  renameError,
  renameValue,
  setRenameDialog,
  setRenameError,
  setRenameValue,
}: {
  loadScreenshots: () => Promise<void>;
  params?: string;
  renameDialog: { screenshotId: string } | null;
  renameError: string | null;
  renameValue: string;
  setRenameDialog: React.Dispatch<
    React.SetStateAction<{ screenshotId: string } | null>
  >;
  setRenameError: React.Dispatch<React.SetStateAction<string | null>>;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  const t = useTranslations<{ screenshots: T }>().screenshots.renameDialog;
  const projectPath = useProjectPath();

  const performRename = async () => {
    if (!renameDialog) return;

    const newName = renameValue.trim();
    if (!newName) {
      setRenameError("Name is required");
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

      setRenameDialog(null);
      await loadScreenshots();
    } catch (e) {
      setRenameError("Failed to rename screenshot");
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
            setRenameValue(value);
            setRenameError(null);
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
  params,
  setDeleteDialog,
}: {
  deleteDialog: { screenshotId: string } | null;
  loadScreenshots: () => Promise<void>;
  params?: string;
  setDeleteDialog: React.Dispatch<
    React.SetStateAction<{ screenshotId: string } | null>
  >;
}) {
  const t = useTranslations<{ screenshots: T }>().screenshots.deleteDialog;
  const projectPath = useProjectPath();

  const performDelete = async () => {
    if (!deleteDialog) return;

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

      setDeleteDialog(null);
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
