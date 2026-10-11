import { serialize } from "@liqvid/ssr/serde";
import { promiseAllKeyed } from "@liqvid/utils";
import { RelativeDir } from "effect-paths";

import { getServerState } from "#_/initialize";
import { getTranslations } from "#_/utils/i18n";
import { TranslationProvider } from "#_/utils/react";

import { ProjectListClient, type ProjectListProps } from "./client.tsx";
import type { TranslationsCaptionsSection } from "./MediaDialog/captions/CaptionsSection.tsx";
import type { TranslationsMediaDialog } from "./MediaDialog/client.tsx";
import type { TranslationsRendersSection } from "./MediaDialog/RendersSection/RendersSection.tsx";
import type { TranslationsScreenshotsSection } from "./MediaDialog/screenshots/ScreenshotsSection.tsx";
import type { TranslationsThumbnailsSection } from "./MediaDialog/ThumbnailsSection/ThumbnailsSection.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = {
  captions: TranslationsCaptionsSection;
  media: TranslationsMediaDialog;
  renders: TranslationsRendersSection;
  screenshots: TranslationsScreenshotsSection;
  thumbs: TranslationsThumbnailsSection;
} & typeof TranslationsJson;

export async function ProjectList(
  props: Omit<ProjectListProps, "projects" | "t">,
) {
  const state = getServerState();
  const projectsInitialized = state.projectsInitialized;
  if (projectsInitialized === null) {
    throw new Error("Project list rendered before initialization started");
  }

  const { base, captions, media, renders, screenshots, thumbs } =
    await promiseAllKeyed({
      base: getTranslations<typeof TranslationsJson>(import.meta.url),
      captions: getTranslations<TranslationsCaptionsSection>(
        import.meta.url,
        RelativeDir("./MediaDialog/captions"),
      ),
      media: getTranslations<TranslationsMediaDialog>(
        import.meta.url,
        RelativeDir("./MediaDialog"),
      ),
      renders: getTranslations<TranslationsRendersSection>(
        import.meta.url,
        RelativeDir("./MediaDialog/RendersSection"),
      ),
      screenshots: getTranslations<TranslationsScreenshotsSection>(
        import.meta.url,
        RelativeDir("./MediaDialog/screenshots"),
      ),
      thumbs: getTranslations<TranslationsThumbnailsSection>(
        import.meta.url,
        RelativeDir("./MediaDialog/ThumbnailsSection"),
      ),
    });

  await projectsInitialized;

  const t: T = { captions, media, renders, screenshots, thumbs, ...base };

  return (
    <TranslationProvider t={t}>
      <ProjectListClient {...props} projects={serialize(state.projects)} />
    </TranslationProvider>
  );
}
