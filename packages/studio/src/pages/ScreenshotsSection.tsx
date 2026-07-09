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
import { useCallback, useEffect, useState } from "react";

import {
  checkImageExists,
  clientRuntime,
  copyScreenshot,
  deleteScreenshot,
  LiqvidStudioApiClient,
  renameScreenshot,
} from "../client.mts";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog.tsx";

import { ScreenshotModal } from "./ScreenshotModal.tsx";

import styles from "./root.module.css";
import shareStyles from "./share.module.css";

interface ScreenshotsSectionProps {
  basePath: string;
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;
  productionServerPort: number;
  /** Whether the parent dialog is open */
  isOpen: boolean;
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
    target: "opengraph-image.png" | "twitter-image.png";
    variant?: "Light" | "Dark" | null;
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

  const handleCopyAs = async (
    screenshotId: string,
    target: "opengraph-image.png" | "twitter-image.png",
    variant?: "Light" | "Dark" | null,
  ) => {
    const checkResult = await checkImageExists({
      search: { filename: target, projectPath },
    });

    if (checkResult.isOk && checkResult.unwrap().exists) {
      setConfirmDialog({ screenshotId, target, variant });
      return;
    }

    await performCopy(screenshotId, target, variant);
  };

  const performCopy = async (
    screenshotId: string,
    target: "opengraph-image.png" | "twitter-image.png",
    variant?: "Light" | "Dark" | null,
  ) => {
    try {
      const result = await copyScreenshot({
        body: {
          screenshotId,
          sourceFilename: variant
            ? (`${variant.toLowerCase()}.png` as "light.png" | "dark.png")
            : undefined,
          targetFilename: target,
        },
        search: { projectPath },
      });

      if (result.isErr) {
        console.error("Failed to copy screenshot:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Failed to copy screenshot:", e);
    }
  };

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
      const result = await renameScreenshot({
        body: { newName, screenshotId: renameDialog.screenshotId },
        search: { projectPath },
      });

      if (result.isErr) {
        setRenameError("Failed to rename screenshot");
        console.error("Failed to rename screenshot:", result.unwrapErr());
        return;
      }

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
      const result = await deleteScreenshot({
        body: { screenshotId: deleteDialog.screenshotId },
        search: { projectPath },
      });

      if (result.isErr) {
        console.error("Failed to delete screenshot:", result.unwrapErr());
        return;
      }

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
          <ul className={shareStyles.screenshotList}>
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
                <li
                  className={shareStyles.screenshotItem}
                  key={`${screenshot.id}-${variant.label ?? "single"}`}
                >
                  <img
                    alt={`Screenshot from ${screenshot.meta.createdAt}${variant.label ? ` (${variant.label})` : ""}`}
                    className={shareStyles.screenshotThumbnail}
                    src={`/api/liqvid/static${encodeURIComponent(`${projectPath}${variant.path}`)}`}
                  />
                  <div className={shareStyles.screenshotInfo}>
                    <span className={shareStyles.screenshotDate}>
                      {new Date(screenshot.meta.createdAt).toLocaleString()}
                      {variant.label && ` (${variant.label})`}
                    </span>
                    <span className={shareStyles.screenshotDimensions}>
                      {screenshot.meta.width} x {screenshot.meta.height}
                    </span>
                  </div>
                  <div className={shareStyles.screenshotActions}>
                    <button
                      className={shareStyles.copyButton}
                      onClick={() =>
                        handleCopyAs(
                          screenshot.id,
                          "opengraph-image.png",
                          variant.label,
                        )
                      }
                      title="Use as OpenGraph image"
                      type="button"
                    >
                      <CopyIcon size={14} /> OG
                    </button>
                    <button
                      className={shareStyles.copyButton}
                      onClick={() =>
                        handleCopyAs(
                          screenshot.id,
                          "twitter-image.png",
                          variant.label,
                        )
                      }
                      title="Use as Twitter image"
                      type="button"
                    >
                      <CopyIcon size={14} /> Twitter
                    </button>
                    {variantIndex === 0 && (
                      <>
                        <button
                          className={shareStyles.iconButton}
                          onClick={() => openRenameDialog(screenshot.id)}
                          title="Rename screenshot"
                          type="button"
                        >
                          <PencilSimpleIcon size={14} />
                        </button>
                        <button
                          className={shareStyles.deleteButton}
                          onClick={() =>
                            setDeleteDialog({ screenshotId: screenshot.id })
                          }
                          title="Delete screenshot"
                          type="button"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </li>
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
            <div className={styles.dialogActions}>
              <DialogClose>Cancel</DialogClose>
              <button
                className={styles.submitButton}
                onClick={() => {
                  if (confirmDialog) {
                    performCopy(
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
            <div className={styles.formField}>
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
                <span className={styles.fieldError}>{renameError}</span>
              )}
            </div>
            <div className={styles.dialogActions}>
              <DialogClose>Cancel</DialogClose>
              <button
                className={styles.submitButton}
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
            <div className={styles.dialogActions}>
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
