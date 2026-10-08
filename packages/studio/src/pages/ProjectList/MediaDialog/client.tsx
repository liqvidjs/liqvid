"use client";

import type { Duration } from "@liqvid/duration";
import type {
  ParameterConfig,
  ParameterValues,
  ProjectMeta,
} from "@liqvid/schemas";
import {
  CameraIcon,
  ClosedCaptioningIcon,
  FilmSlateIcon,
  FilmStripIcon,
  ImagesIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { useLiqvidConfig } from "#_/contexts/liqvid-config";
import type { Localized } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import {
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "#_/ui/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#_/ui/Tabs";
import { getDefaultParams } from "#_/utils/parameters-client";
import { useTranslations } from "#_/utils/react";

import { CaptionsSection } from "./captions/CaptionsSection.tsx";
import { ParameterSelector } from "./ParameterSelector.tsx";
import { RendersSection } from "./RendersSection/RendersSection.tsx";
import { ScreenshotsSection } from "./screenshots/ScreenshotsSection.tsx";
import { ThumbnailsSection } from "./ThumbnailsSection/ThumbnailsSection.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export type { T as TranslationsMediaDialog };

interface ShareButtonProps {
  basePath: string;
  duration: Duration;
  project: Omit<ProjectMeta, "duration">;

  /** Currently selected root parameter values */
  selectedRootParams: ParameterValues;
}

/**
 * Get project-level parameters that should be shown in the media dialog.
 * Only shows parameters where:
 * 1. The project defines its own values that differ from root parameters, OR
 * 2. The project has more values for that parameter than the root
 */
function getProjectOnlyParameters(
  projectParameters: ParameterConfig | undefined,
  rootParameters: ParameterConfig,
): ParameterConfig {
  if (!projectParameters) {
    return {};
  }

  const result: Record<string, string[]> = {};

  for (const [key, projectValues] of Object.entries(projectParameters)) {
    const rootValues = rootParameters[key];

    // Include if project has more values than root
    if (!rootValues || projectValues.length > rootValues.length) {
      result[key] = [...projectValues];
      continue;
    }

    // Include if project has different values than root
    const projectSet = new Set(projectValues);
    const rootSet = new Set(rootValues);
    const hasDifferentValues =
      projectValues.some((v) => !rootSet.has(v)) ||
      rootValues.some((v) => !projectSet.has(v));

    if (hasDifferentValues) {
      result[key] = [...projectValues];
    }
  }

  return result;
}

export function MediaButton({
  basePath,
  duration,
  project,
  selectedRootParams,
}: ShareButtonProps) {
  const { rootParameters } = useLiqvidConfig();
  const t = useTranslations<{ media: T }>().media;

  // Get only project-level parameters that differ from root
  const projectOnlyParams = useMemo(
    () => getProjectOnlyParameters(project.parameters, rootParameters),
    [project.parameters, rootParameters],
  );

  // Check if we have any project-specific parameters to show
  const hasProjectOnlyParams = Object.keys(projectOnlyParams).some(
    (key) => projectOnlyParams[key]!.length > 0,
  );

  // State for selected project-only parameter values.
  // Seed from selectedRootParams for keys that exist there, so the dialog
  // opens reflecting the same value already chosen at the root level.
  const [selectedProjectParams, setSelectedProjectParams] = useState<
    Record<string, string>
  >(() => {
    const defaults = getDefaultParams(projectOnlyParams);
    for (const key of Object.keys(defaults)) {
      if (key in selectedRootParams) {
        defaults[key] = selectedRootParams[key]!;
      }
    }
    return defaults;
  });

  // Combine selected root params with project-specific params for API calls
  // Project params override root params
  const selectedParams = useMemo(
    () => ({ ...selectedRootParams, ...selectedProjectParams }),
    [selectedRootParams, selectedProjectParams],
  );

  // Determine if we have any parameters at all (for passing to sections)
  const hasAnyParameters =
    hasProjectOnlyParams ||
    Object.values(rootParameters).some((v) => v.length > 0);

  return (
    <DialogRoot>
      <DialogTrigger render={<Button />} title={t.trigger}>
        <FilmSlateIcon size={20} />
      </DialogTrigger>
      <DialogPortal>
        <DialogBackdrop />
        <DialogPopup aria-describedby={undefined} size="large">
          <DialogTitle>{t.title}</DialogTitle>

          <DialogClose />

          {/* Parameter selector - only show project-specific parameters */}
          {hasProjectOnlyParams && (
            <ParameterSelector
              onParamsChange={setSelectedProjectParams}
              parameters={projectOnlyParams}
              selectedParams={selectedProjectParams}
            />
          )}

          <Tabs defaultValue="screenshots">
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
                project={project}
                selectedParams={hasAnyParameters ? selectedParams : undefined}
              />
            </TabsContent>

            <TabsContent value="thumbnails">
              <ThumbnailsSection
                duration={duration}
                selectedParams={hasAnyParameters ? selectedParams : undefined}
              />
            </TabsContent>

            <TabsContent value="renders">
              <RendersSection
                aspectRatio={project.aspectRatio}
                selectedParams={hasAnyParameters ? selectedParams : undefined}
              />
            </TabsContent>

            <TabsContent value="captions">
              <CaptionsSection
                selectedParams={hasAnyParameters ? selectedParams : undefined}
              />
            </TabsContent>
          </Tabs>
        </DialogPopup>
      </DialogPortal>
    </DialogRoot>
  );
}
