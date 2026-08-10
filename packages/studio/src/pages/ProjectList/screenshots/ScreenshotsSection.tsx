"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta, ScreenshotEntry } from "@liqvid/schemas";
import { useProjectPath } from "@liqvid/studio-plugin-api";
import {
  CopyIcon,
  FolderOpenIcon,
  PencilSimpleIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { useCallback, useEffect, useId, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "../../../client.mts";
import { Button } from "../../../ui/Button.tsx";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  useDialogApi,
} from "../../../ui/Dialog.tsx";
import { Time } from "../../../ui/Time.tsx";
import {
  useCommonTranslations,
  useTranslations,
} from "../../../utils/react.tsx";
import { openScreenshotInFinderAction } from "../../root-actions.ts";

import { ScreenshotModal } from "./ScreenshotModal.tsx";

import rootStyles from "../../root.module.css";
import shareStyles from "../share.module.css";
import styles from "./screenshots.module.css";

import type TranslationsJson from "../.translations/en.json";

type T = typeof TranslationsJson;

interface ScreenshotsSectionProps {
  basePath: string;
  duration: Duration;
  productionServerPort: number;
  project: Omit<ProjectMeta, "duration">;
}

type ConfirmState = {
  screenshotId: string;
  target: CopyTarget;
  variant?: VariantLabel;
};

type CopyTarget = "opengraph-image.png" | "twitter-image.png";
type VariantLabel = "Light" | "Dark" | null;

async function copyScreenshot(
  projectPath: RelativeDir,
  screenshotId: string,
  target: CopyTarget,
  variant?: VariantLabel,
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
          query: { projectPath },
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
}: ScreenshotItemProps) {
  const t = useTranslations<T>().screenshots.item;
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

    await copyScreenshot(projectPath, screenshot.id, target, variant.label);
  };

  const handleOpenInFinder = async () => {
    await openScreenshotInFinderAction(projectPath, screenshot.id);
  };

  const alt = `Screenshot from ${screenshot.meta.createdAt}${variant.label ? ` (${variant.label})` : ""}`;
  const src = `/api/liqvid/static${encodeURIComponent(`${projectPath}${variant.path}`)}`;

  return (
    <li className={styles.screenshotItem}>
      <Button
        className={styles.screenshotThumbnailButton}
        onClick={() => onPreview(src, alt)}
        title={t.viewFullSize}
        type="button"
      >
        <img alt={alt} className={styles.screenshotThumbnail} src={src} />
      </Button>
      <div className={styles.screenshotInfo}>
        <span className={styles.screenshotTitle}>
          {screenshot.id ||
            new Date(screenshot.meta.createdAt).toLocaleString()}
          {variant.label && ` (${variant.label})`}
        </span>
        <span className={styles.screenshotCreated}>
          <Time format="long" value={screenshot.meta.createdAt} />
        </span>
        <span className={styles.screenshotDimensions}>
          {screenshot.meta.width}
          {" x "}
          {screenshot.meta.height}
        </span>
      </div>
      <div className={styles.screenshotActions}>
        <Button
          className={shareStyles.copyButton}
          onClick={() => handleCopyAs("opengraph-image.png")}
          title={t.useOpenGraph}
        >
          <CopyIcon size={14} />
          {" OG"}
        </Button>
        <Button
          className={shareStyles.copyButton}
          onClick={() => handleCopyAs("twitter-image.png")}
          title={t.useTwitter}
        >
          <CopyIcon size={14} />
          {" Twitter"}
        </Button>
        {isPrimary && (
          <>
            <Button
              className={shareStyles.iconButton}
              onClick={handleOpenInFinder}
              title={t.openInFinder}
            >
              <FolderOpenIcon size={14} />
            </Button>
            <Button
              className={shareStyles.iconButton}
              onClick={() => onRename(screenshot.id)}
              title={t.rename}
            >
              <PencilSimpleIcon size={14} />
            </Button>
            <Button
              className={shareStyles.deleteButton}
              onClick={() => onDelete(screenshot.id)}
              title={t.delete}
            >
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
  productionServerPort,
  project,
}: ScreenshotsSectionProps) {
  const t = useTranslations<T>().screenshots;
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

  const loadScreenshots = useCallback(async () => {
    setIsLoading(true);

    await clientRuntime.runPromise(
      Effect.gen(function* () {
        const client = yield* LiqvidStudioApiClient;

        const screenshots = yield* client.screenshots.list({
          query: { projectPath },
        });

        setScreenshots(screenshots);
      }),
    );

    setIsLoading(false);
  }, [projectPath]);

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
      <div className={shareStyles.section}>
        <DialogRoot>
          <div className={shareStyles.sectionActions}>
            <DialogTrigger className={shareStyles.addButton}>
              <PlusIcon size={16} /> {t.trigger}
            </DialogTrigger>
          </div>
          <ScreenshotModal
            basePath={basePath}
            duration={duration}
            onCaptured={loadScreenshots}
            productionServerPort={productionServerPort}
            project={project}
          />
        </DialogRoot>

        {isLoading ? (
          <div className={shareStyles.loading}>
            <SpinnerIcon className={shareStyles.spinner} size={24} />
          </div>
        ) : screenshots.length === 0 ? (
          <p className={shareStyles.emptyMessage}>{t.empty}</p>
        ) : (
          <ul className={styles.screenshotList}>
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
                  screenshot={screenshot}
                  variant={variant}
                />
              ));
            })}
          </ul>
        )}
      </div>

      {/* Confirmation Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        open={!!confirmDialog}
      >
        <ConfirmationDialog {...{ confirmDialog, setConfirmDialog }} />
      </DialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setRenameDialog(null)}
        open={!!renameDialog}
      >
        <DialogPortal>
          <DialogBackdrop />
          <RenameDialog
            {...{
              loadScreenshots,
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
      <DialogRoot
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        open={!!deleteDialog}
      >
        <DeleteDialog {...{ deleteDialog, loadScreenshots, setDeleteDialog }} />
      </DialogRoot>

      {/* Preview Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setPreviewDialog(null)}
        open={!!previewDialog}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup style={{ maxWidth: "90vw", width: "90vw" }}>
            <DialogClose />
            {previewDialog && (
              <img
                alt={previewDialog.alt}
                className={styles.screenshotPreviewImage}
                src={previewDialog.src}
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
  setConfirmDialog,
}: {
  confirmDialog: ConfirmState | null;
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmState | null>>;
}) {
  const t = useTranslations<T>().screenshots.confirmDialog;
  const c = useCommonTranslations();
  const projectPath = useProjectPath();

  return (
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup>
        <DialogTitle>{t.title}</DialogTitle>
        <p className={shareStyles.confirmMessage}>
          {t.message({
            filename: (
              <code className={shareStyles.filename}>
                {confirmDialog?.target}
              </code>
            ),
          })}
        </p>
        <div className={rootStyles.dialogActions}>
          <DialogClose>{c.cancel}</DialogClose>
          <Button
            className={rootStyles.submitButton}
            onClick={() => {
              if (confirmDialog) {
                copyScreenshot(
                  projectPath,
                  confirmDialog.screenshotId,
                  confirmDialog.target,
                  confirmDialog.variant,
                );
                setConfirmDialog(null);
              }
            }}
          >
            {t.action}
          </Button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}

function RenameDialog({
  loadScreenshots,
  renameDialog,
  renameError,
  renameValue,
  setRenameDialog,
  setRenameError,
  setRenameValue,
}: {
  loadScreenshots: () => Promise<void>;
  renameDialog: { screenshotId: string } | null;
  renameError: string | null;
  renameValue: string;
  setRenameDialog: React.Dispatch<
    React.SetStateAction<{ screenshotId: string } | null>
  >;
  setRenameError: React.Dispatch<React.SetStateAction<string | null>>;
  setRenameValue: React.Dispatch<React.SetStateAction<string>>;
}) {
  const t = useTranslations<T>().screenshots.renameDialog;
  const c = useCommonTranslations();
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
            query: { projectPath },
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

  const id = useId();

  return (
    <DialogPopup>
      <DialogTitle>{t.title}</DialogTitle>
      <div className={rootStyles.formField}>
        <label htmlFor={id}>{t.newName}</label>
        <input
          id={id}
          onChange={(e) => {
            setRenameValue(e.target.value);
            setRenameError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              performRename();
            }
          }}
          value={renameValue}
        />
        {renameError && (
          <span className={rootStyles.fieldError}>{renameError}</span>
        )}
      </div>
      <div className={rootStyles.dialogActions}>
        <DialogClose>{c.cancel}</DialogClose>
        <Button
          className={rootStyles.submitButton}
          onClick={() => performRename()}
        >
          {t.action}
        </Button>
      </div>
    </DialogPopup>
  );
}

function DeleteDialog({
  deleteDialog,
  loadScreenshots,
  setDeleteDialog,
}: {
  deleteDialog: { screenshotId: string } | null;
  loadScreenshots: () => Promise<void>;
  setDeleteDialog: React.Dispatch<
    React.SetStateAction<{ screenshotId: string } | null>
  >;
}) {
  const t = useTranslations<T>().screenshots.deleteDialog;
  const c = useCommonTranslations();
  const projectPath = useProjectPath();

  const performDelete = async () => {
    if (!deleteDialog) return;

    try {
      await clientRuntime.runPromise(
        Effect.gen(function* () {
          const client = yield* LiqvidStudioApiClient;

          yield* client.screenshots.delete({
            payload: { screenshotId: deleteDialog.screenshotId },
            query: { projectPath },
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
    <DialogPortal>
      <DialogBackdrop />
      <DialogPopup>
        <DialogTitle>{t.title}</DialogTitle>
        <p className={shareStyles.confirmMessage}>{t.confirm}</p>
        <div className={rootStyles.dialogActions}>
          <DialogClose>{c.cancel}</DialogClose>
          <Button
            className={shareStyles.deleteConfirmButton}
            onClick={() => performDelete()}
          >
            {t.action}
          </Button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}
