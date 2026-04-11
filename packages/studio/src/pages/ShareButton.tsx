"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas/project";
import { ShareFatIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog";

import { ScreenshotsSection } from "./ScreenshotsSection";
import { ThumbnailsSection } from "./ThumbnailsSection";

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

  return (
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

          <ScreenshotsSection
            duration={duration}
            isOpen={open}
            productionServerPort={productionServerPort}
            project={project}
          />

          <ThumbnailsSection isOpen={open} projectPath={project.path} />

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
  );
}
