"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas/project";
import { ShareFatIcon } from "@phosphor-icons/react";
import { useState } from "react";

import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "../ui/Dialog.tsx";

import { CaptionsSection } from "./CaptionsSection.tsx";
import { RendersSection } from "./RendersSection.tsx";
import { ScreenshotsSection } from "./ScreenshotsSection.tsx";
import { ThumbnailsSection } from "./ThumbnailsSection.tsx";

import styles from "./root.module.css";
import shareStyles from "./share.module.css";

interface ShareButtonProps {
  basePath: string;
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;
  productionServerPort: number;
}

export function ShareButton({
  basePath,
  duration,
  project,
  productionServerPort,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot onOpenChange={setOpen} open={open}>
      <DialogTrigger
        className={styles.rebuildButton}
        title="Share options"
        type="button"
      >
        <ShareFatIcon size={16} weight="fill" />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop className={styles.dialogOverlay} />
        <DialogPopup
          aria-describedby={undefined}
          className={`${styles.dialog} ${shareStyles.shareDialog}`}
        >
          <DialogTitle className={styles.dialogTitle}>Share</DialogTitle>

          <ScreenshotsSection
            basePath={basePath}
            duration={duration}
            isOpen={open}
            productionServerPort={productionServerPort}
            project={project}
          />

          <ThumbnailsSection isOpen={open} projectPath={project.path} />

          <RendersSection isOpen={open} projectPath={project.path} />

          <CaptionsSection isOpen={open} projectPath={project.path} />

          <div className={styles.dialogActions}>
            <DialogClose>Close</DialogClose>
          </div>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
