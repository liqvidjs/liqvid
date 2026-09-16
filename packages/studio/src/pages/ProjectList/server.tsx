import { promiseAllKeyed } from "@liqvid/utils";
import { RelativeDir } from "effect-paths";

import { getTranslations } from "#_/utils/i18n.mjs";
import { TranslationProvider } from "#_/utils/react.js";

import { ProjectListClient, type ProjectListProps } from "./client.tsx";
import type { TranslationsCaptionsSection } from "./MediaDialog/captions/CaptionsSection.tsx";
import type { TranslationsMediaDialog } from "./MediaDialog/client.tsx";
import type { TranslationsRendersSection } from "./MediaDialog/RendersSection/RendersSection.tsx";
import type { TranslationsScreenshotsSection } from "./MediaDialog/screenshots/ScreenshotsSection.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = {
  captions: TranslationsCaptionsSection;
  media: TranslationsMediaDialog;
  renders: TranslationsRendersSection;
  screenshots: TranslationsScreenshotsSection;
} & typeof TranslationsJson;

export async function ProjectList(props: Omit<ProjectListProps, "t">) {
  const { base, captions, media, renders, screenshots } = await promiseAllKeyed(
    {
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
    },
  );

  const t: T = { captions, media, renders, screenshots, ...base };

  return (
    <TranslationProvider t={t}>
      <ProjectListClient {...props} />
    </TranslationProvider>
  );
}
