"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas/project";
import {
  CameraIcon,
  ClosedCaptioningIcon,
  FilmStripIcon,
  ImagesIcon,
  ShareFatIcon,
} from "@phosphor-icons/react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs.tsx";

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
          size="large"
        >
          <DialogTitle className={styles.dialogTitle}>Share</DialogTitle>

          <Tabs className={shareStyles.shareTabs} defaultValue="screenshots">
            <TabsList style={{ fontSize: "18px" }}>
              <TabsTrigger value="screenshots">
                <CameraIcon size={14} /> Screenshots
              </TabsTrigger>
              <TabsTrigger value="thumbnails">
                <ImagesIcon size={14} /> Thumbnails
              </TabsTrigger>
              <TabsTrigger value="renders">
                <FilmStripIcon size={14} /> Renders
              </TabsTrigger>
              <TabsTrigger value="captions">
                <ClosedCaptioningIcon size={14} /> Captions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screenshots">
              <ScreenshotsSection
                basePath={basePath}
                duration={duration}
                isOpen={open}
                productionServerPort={productionServerPort}
                project={project}
              />
            </TabsContent>

            <TabsContent value="thumbnails">
              <ThumbnailsSection
                duration={duration}
                isOpen={open}
                projectPath={project.path}
              />
            </TabsContent>

            <TabsContent value="renders">
              <RendersSection
                aspectRatio={project.aspectRatio}
                isOpen={open}
                projectPath={project.path}
              />
            </TabsContent>

            <TabsContent value="captions">
              <CaptionsSection isOpen={open} projectPath={project.path} />
            </TabsContent>
          </Tabs>

          <div className={styles.dialogActions}>
            <DialogClose>Close</DialogClose>
          </div>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
