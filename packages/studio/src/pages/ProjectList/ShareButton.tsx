"use client";

import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas";
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
} from "../../ui/Dialog.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../ui/Tabs.tsx";
import { useCommonTranslations, useTranslations } from "../../utils/react.tsx";

import { CaptionsSection } from "./captions/CaptionsSection.tsx";
import { RendersSection } from "./renders/RendersSection.tsx";
import { ScreenshotsSection } from "./screenshots/ScreenshotsSection.tsx";
import { ThumbnailsSection } from "./ThumbnailsSection.tsx";

import rootStyles from "../root.module.css";
import shareStyles from "./share.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

interface ShareButtonProps {
  basePath: string;
  duration: Duration;
  productionServerPort: number;
  project: Omit<ProjectMeta, "duration">;
}

export function ShareButton({
  basePath,
  duration,
  project,
  productionServerPort,
}: ShareButtonProps) {
  const t = useTranslations<T>().share;
  const c = useCommonTranslations();
  const [open, setOpen] = useState(false);

  return (
    <DialogRoot onOpenChange={setOpen} open={open}>
      <DialogTrigger
        className={rootStyles.rebuildButton}
        title={t.trigger}
        type="button"
      >
        <ShareFatIcon size={16} weight="fill" />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-describedby={undefined}
          className={`${rootStyles.dialog} ${shareStyles.shareDialog}`}
          size="large"
        >
          <DialogTitle className={rootStyles.dialogTitle}>
            {t.title}
          </DialogTitle>

          <DialogClose />

          <Tabs className={shareStyles.shareTabs} defaultValue="screenshots">
            <TabsList style={{ fontSize: "18px" }}>
              <TabsTrigger value="screenshots">
                <CameraIcon size={14} /> {t.tabs.screenshots}
              </TabsTrigger>
              <TabsTrigger value="thumbnails">
                <ImagesIcon size={14} /> {t.tabs.thumbnails}
              </TabsTrigger>
              <TabsTrigger value="renders">
                <FilmStripIcon size={14} /> {t.tabs.renders}
              </TabsTrigger>
              <TabsTrigger value="captions">
                <ClosedCaptioningIcon size={14} /> {t.tabs.captions}
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
              <ThumbnailsSection duration={duration} isOpen={open} />
            </TabsContent>

            <TabsContent value="renders">
              <RendersSection aspectRatio={project.aspectRatio} isOpen={open} />
            </TabsContent>

            <TabsContent value="captions">
              <CaptionsSection isOpen={open} />
            </TabsContent>
          </Tabs>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
