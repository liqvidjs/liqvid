import type { Duration } from "@liqvid/duration";
import type { ProjectMeta } from "@liqvid/schemas";
import {
  CameraIcon,
  ClosedCaptioningIcon,
  FilmSlateIcon,
  FilmStripIcon,
  ImagesIcon,
} from "@phosphor-icons/react";

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
import { useTranslations } from "../../utils/react.tsx";

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

export function MediaButton({
  basePath,
  duration,
  project,
  productionServerPort,
}: ShareButtonProps) {
  const t = useTranslations<T>().media;

  return (
    <DialogRoot>
      <DialogTrigger
        className={rootStyles.rebuildButton}
        title={t.trigger}
        type="button"
      >
        <FilmSlateIcon size={16} />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup
          aria-describedby={undefined}
          className={shareStyles.shareDialog}
          size="large"
        >
          <DialogTitle>{t.title}</DialogTitle>

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
                productionServerPort={productionServerPort}
                project={project}
              />
            </TabsContent>

            <TabsContent value="thumbnails">
              <ThumbnailsSection duration={duration} />
            </TabsContent>

            <TabsContent value="renders">
              <RendersSection aspectRatio={project.aspectRatio} />
            </TabsContent>

            <TabsContent value="captions">
              <CaptionsSection />
            </TabsContent>
          </Tabs>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
