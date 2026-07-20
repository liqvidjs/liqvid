"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta, ScreenshotEntry } from "@liqvid/schemas/effect";
import {
  CopyIcon,
  PencilSimpleIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Effect } from "effect";
import type { RelativeDir } from "effect-paths";
import { useCallback, useEffect, useState } from "react";

import { clientRuntime, LiqvidStudioApiClient } from "../../../client.mts";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../../../ui/Dialog.tsx";
import { Time } from "../../../ui/Time.tsx";

import { ScreenshotModal } from "./ScreenshotModal.tsx";

import rootStyles from "../../root.module.css";
import shareStyles from "../share.module.css";
import styles from "./screenshots.module.css";

interface ScreenshotsSectionProps {
  basePath: string;
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;
  productionServerPort: number;
  /** Whether the parent dialog is open */
  isOpen: boolean;
}

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
  screenshot: ScreenshotEntry;
  projectPath: RelativeDir;
  variant: { label: VariantLabel; path: string };
  /** Whether this is the first variant of the screenshot */
  isPrimary: boolean;
  /** Ask the parent to confirm overwriting an existing target file */
  onConfirmOverwrite: (
    screenshotId: string,
    target: CopyTarget,
    variant?: VariantLabel,
  ) => void;
  onRename: (screenshotId: string) => void;
  onDelete: (screenshotId: string) => void;
}

function ScreenshotItem({
  screenshot,
  projectPath,
  variant,
  isPrimary,
  onConfirmOverwrite,
  onRename,
  onDelete,
}: ScreenshotItemProps) {
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

  return (
    <li className={styles.screenshotItem}>
      <img
        alt={`Screenshot from ${screenshot.meta.createdAt}${variant.label ? ` (${variant.label})` : ""}`}
        className={styles.screenshotThumbnail}
        src={`/api/liqvid/static${encodeURIComponent(`${projectPath}${variant.path}`)}`}
      />
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
          {screenshot.meta.width} x {screenshot.meta.height}
        </span>
      </div>
      <div className={styles.screenshotActions}>
        <button
          className={shareStyles.copyButton}
          onClick={() => handleCopyAs("opengraph-image.png")}
          title="Use as OpenGraph image"
          type="button"
        >
          <CopyIcon size={14} /> OG
        </button>
        <button
          className={shareStyles.copyButton}
          onClick={() => handleCopyAs("twitter-image.png")}
          title="Use as Twitter image"
          type="button"
        >
          <CopyIcon size={14} /> Twitter
        </button>
        {isPrimary && (
          <>
            <button
              className={shareStyles.iconButton}
              onClick={() => onRename(screenshot.id)}
              title="Rename screenshot"
              type="button"
            >
              <PencilSimpleIcon size={14} />
            </button>
            <button
              className={shareStyles.deleteButton}
              onClick={() => onDelete(screenshot.id)}
              title="Delete screenshot"
              type="button"
            >
              <TrashIcon size={14} />
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export function ScreenshotsSection({
  basePath,
  duration,
  isOpen,
  productionServerPort,
  project,
}: ScreenshotsSectionProps) {
  const [screenshots, setScreenshots] = useState<readonly ScreenshotEntry[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    screenshotId: string;
    target: CopyTarget;
    variant?: VariantLabel;
  } | null>(null);
  const [renameDialog, setRenameDialog] = useState<{
    screenshotId: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    screenshotId: string;
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
    <>
      <div className={shareStyles.section}>
        <DialogRoot>
          <div className={shareStyles.sectionActions}>
            <DialogTrigger className={shareStyles.addButton}>
              <PlusIcon size={16} /> Add
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
          <p className={shareStyles.emptyMessage}>
            No screenshots yet. Click "Add" to capture one.
          </p>
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
                  onRename={openRenameDialog}
                  projectPath={projectPath}
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
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Confirm Overwrite</DialogTitle>
            <p className={shareStyles.confirmMessage}>
              The file{" "}
              <code className={shareStyles.filename}>
                {confirmDialog?.target}
              </code>{" "}
              already exists. Do you want to replace it?
            </p>
            <div className={rootStyles.dialogActions}>
              <DialogClose>Cancel</DialogClose>
              <button
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
                type="button"
              >
                Replace
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>

      {/* Rename Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setRenameDialog(null)}
        open={!!renameDialog}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Rename Screenshot</DialogTitle>
            <div className={rootStyles.formField}>
              <label htmlFor="screenshot-rename-input">New name</label>
              <input
                id="screenshot-rename-input"
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
              <DialogClose>Cancel</DialogClose>
              <button
                className={rootStyles.submitButton}
                onClick={() => performRename()}
                type="button"
              >
                Rename
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>

      {/* Delete Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        open={!!deleteDialog}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPopup>
            <DialogTitle>Delete Screenshot</DialogTitle>
            <p className={shareStyles.confirmMessage}>
              Are you sure you want to delete this screenshot? This action
              cannot be undone.
            </p>
            <div className={rootStyles.dialogActions}>
              <DialogClose>Cancel</DialogClose>
              <button
                className={shareStyles.deleteConfirmButton}
                onClick={() => performDelete()}
                type="button"
              >
                Delete
              </button>
            </div>
          </DialogPopup>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}
