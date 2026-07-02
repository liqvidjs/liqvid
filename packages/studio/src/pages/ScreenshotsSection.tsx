"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas/project";
import type { ScreenshotEntry } from "@liqvid/schemas/screenshot-meta";
import { CopyIcon, PlusIcon, SpinnerIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import {
  checkImageExists,
  copyScreenshot,
  listScreenshots,
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
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    screenshotId: string;
    target: "opengraph-image.png" | "twitter-image.png";
    variant?: "Light" | "Dark" | null;
  } | null>(null);

  const projectPath = project.path;

  const loadScreenshots = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listScreenshots({ search: { projectPath } });
      if (result.isOk) {
        setScreenshots(result.unwrap());
      }
    } catch (e) {
      console.error("Failed to load screenshots:", e);
    } finally {
      setIsLoading(false);
    }
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

              return variants.map((variant) => (
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
    </>
  );
}
