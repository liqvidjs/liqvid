"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas/project";
import type { ScreenshotEntry } from "@liqvid/schemas/screenshot-meta";
import {
  CopyIcon,
  ImagesIcon,
  PlusIcon,
  ShareFatIcon,
  SpinnerIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import {
  checkImageExists,
  copyScreenshot,
  generateThumbs,
  listScreenshots,
  listThumbs,
} from "../client.mts";
import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog";

import { ScreenshotModal } from "./ScreenshotModal";

import styles from "./root.module.css";
import shareStyles from "./share.module.css";

interface ShareButtonProps {
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;
  productionServerPort: number;
}

export function ShareButton({
  duration,
  project,
  productionServerPort,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    screenshotId: string;
    target: "opengraph-image.png" | "twitter-image.png";
    variant?: "Light" | "Dark" | null;
  } | null>(null);

  // Thumbnails state
  const [thumbSheets, setThumbSheets] = useState<{
    dark: string[];
    light: string[];
  }>({ dark: [], light: [] });
  const [isLoadingThumbs, setIsLoadingThumbs] = useState(false);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);

  const projectPath = project.path;

  // Load screenshots when dialog opens
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

  // Load thumbnails when dialog opens
  const loadThumbs = useCallback(async () => {
    setIsLoadingThumbs(true);
    try {
      const result = await listThumbs({ search: { projectPath } });
      if (result.isOk) {
        const { dark, light } = result.unwrap();
        setThumbSheets({ dark, light });
      }
    } catch (e) {
      console.error("Failed to load thumbnails:", e);
    } finally {
      setIsLoadingThumbs(false);
    }
  }, [projectPath]);

  // Generate thumbnails
  const handleGenerateThumbs = async () => {
    setIsGeneratingThumbs(true);
    try {
      const result = await generateThumbs({
        body: {},
        search: { projectPath },
      });

      if (result.isOk) {
        // Reload thumbs list after generation
        await loadThumbs();
      } else {
        console.error("Failed to generate thumbnails:", result.unwrapErr());
      }
    } catch (e) {
      console.error("Failed to generate thumbnails:", e);
    } finally {
      setIsGeneratingThumbs(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadScreenshots();
      loadThumbs();
    }
  }, [open, loadScreenshots, loadThumbs]);

  const handleCopyAs = async (
    screenshotId: string,
    target: "opengraph-image.png" | "twitter-image.png",
    variant?: "Light" | "Dark" | null,
  ) => {
    // Check if file exists first
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
      <DialogRoot onOpenChange={setOpen} open={open}>
        <DialogTrigger asChild>
          <button
            className={styles.rebuildButton}
            title="Share options"
            type="button"
          >
            <ShareFatIcon size={16} weight="fill" />
          </button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay className={styles.dialogOverlay} />
          <DialogContent
            aria-describedby={undefined}
            className={`${styles.dialog} ${shareStyles.shareDialog}`}
          >
            <DialogTitle className={styles.dialogTitle}>Share</DialogTitle>

            {/* Screenshots Section */}
            <div className={shareStyles.section}>
              <DialogRoot>
                <div className={shareStyles.sectionHeader}>
                  <h3>Screenshots</h3>
                  <DialogTrigger asChild>
                    <button className={shareStyles.addButton} type="button">
                      <PlusIcon size={16} /> Add
                    </button>
                  </DialogTrigger>
                </div>
                <ScreenshotModal
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
                          src={`/api/liqvid/static?url=${encodeURIComponent(`${projectPath}${variant.path}`)}`}
                        />
                        <div className={shareStyles.screenshotInfo}>
                          <span className={shareStyles.screenshotDate}>
                            {new Date(
                              screenshot.meta.createdAt,
                            ).toLocaleString()}
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

            {/* Thumbnails Section */}
            <div className={shareStyles.section}>
              <div className={shareStyles.sectionHeader}>
                <h3>Thumbnails</h3>
                <button
                  className={shareStyles.addButton}
                  disabled={isGeneratingThumbs}
                  onClick={handleGenerateThumbs}
                  type="button"
                >
                  {isGeneratingThumbs ? (
                    <>
                      <SpinnerIcon className={shareStyles.spinner} size={16} />{" "}
                      Generating...
                    </>
                  ) : (
                    <>
                      <ImagesIcon size={16} /> Generate
                    </>
                  )}
                </button>
              </div>

              {isLoadingThumbs ? (
                <div className={shareStyles.loading}>
                  <SpinnerIcon className={shareStyles.spinner} size={24} />
                </div>
              ) : thumbSheets.light.length === 0 &&
                thumbSheets.dark.length === 0 ? (
                <p className={shareStyles.emptyMessage}>
                  No thumbnails yet. Click "Generate" to create thumbnail
                  sheets.
                </p>
              ) : (
                <div className={shareStyles.thumbsContainer}>
                  {thumbSheets.light.length > 0 && (
                    <div className={shareStyles.thumbsScheme}>
                      <span className={shareStyles.thumbsSchemeLabel}>
                        Light
                      </span>
                      <div className={shareStyles.thumbsGrid}>
                        {thumbSheets.light.map((sheet) => (
                          <img
                            alt={`Light thumbnail sheet ${sheet}`}
                            className={shareStyles.thumbSheet}
                            key={`light-${sheet}`}
                            src={`/api/liqvid/static?url=${encodeURIComponent(`${projectPath}/.liqvid/thumbs/light/${sheet}`)}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {thumbSheets.dark.length > 0 && (
                    <div className={shareStyles.thumbsScheme}>
                      <span className={shareStyles.thumbsSchemeLabel}>
                        Dark
                      </span>
                      <div className={shareStyles.thumbsGrid}>
                        {thumbSheets.dark.map((sheet) => (
                          <img
                            alt={`Dark thumbnail sheet ${sheet}`}
                            className={shareStyles.thumbSheet}
                            key={`dark-${sheet}`}
                            src={`/api/liqvid/static?url=${encodeURIComponent(`${projectPath}/.liqvid/thumbs/dark/${sheet}`)}`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className={styles.dialogActions}>
              <DialogClose asChild>
                <button className={styles.cancelButton} type="button">
                  Close
                </button>
              </DialogClose>
            </div>
          </DialogContent>
        </DialogPortal>
      </DialogRoot>

      {/* Confirmation Dialog */}
      <DialogRoot
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        open={!!confirmDialog}
      >
        <DialogPortal>
          <DialogOverlay className={styles.dialogOverlay} />
          <DialogContent className={styles.dialog}>
            <DialogTitle className={styles.dialogTitle}>
              Confirm Overwrite
            </DialogTitle>
            <p className={shareStyles.confirmMessage}>
              The file{" "}
              <code className={shareStyles.filename}>
                {confirmDialog?.target}
              </code>{" "}
              already exists. Do you want to replace it?
            </p>
            <div className={styles.dialogActions}>
              <DialogClose asChild>
                <button className={styles.cancelButton} type="button">
                  Cancel
                </button>
              </DialogClose>
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
          </DialogContent>
        </DialogPortal>
      </DialogRoot>
    </>
  );
}
