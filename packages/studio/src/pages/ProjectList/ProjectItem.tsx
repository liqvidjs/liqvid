import { resolveParametrized } from "@liqvid/cli/utils";
import type { ProjectMeta } from "@liqvid/schemas";
import { ProjectPathProvider } from "@liqvid/studio-plugin-api";
import { omit } from "@liqvid/utils";
import { DotsThreeIcon, FileDashedIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useMemo, useState } from "react";

import { useLiqvidConfig } from "#_/contexts/liqvid-config";
import { getPreviewServerOrigin } from "#_/contexts/preview-server-config";
import { useSelectedRootParameters } from "#_/contexts/selected-root-parameters";
import { ASSETS_DIR, SOCIALS_DIR } from "#_/conventions";
import {
  colors,
  dims,
  rounded,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex";
import {
  MenuPopup,
  MenuPortal,
  MenuPositioner,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
} from "#_/ui/Menu";
import { TimeDuration } from "#_/ui/Time";
import { interpolatePathParametersWithSelected } from "#_/utils/parameters-client";
import { useTranslations } from "#_/utils/react";

import { CopyProjectPathButton } from "./CopyProjectPathButton.tsx";
import { EmbedButton } from "./EmbedButton.tsx";
import { MediaButton } from "./MediaDialog/client.tsx";
import { OpenInFinderButton } from "./OpenInFinderButton.tsx";
import { PreviewButton } from "./ProductionLink.tsx";
import { RegenerateProjectFilesButton } from "./RegenerateProjectFilesButton.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

const styles = stylex.create({
  actions: {
    alignItems: "center",
    columnGap: spacing.md,
    display: "flex",
    paddingBlock: spacing.md,
    paddingInline: spacing.xl,
    rowGap: spacing.md,
  },
  duration: {
    backgroundColor: colors.overlayDark,
    borderTopLeftRadius: rounded.sm,
    bottom: 0,
    color: colors.white,
    fontSize: text.xs,
    lineHeight: 1,
    padding: spacing.sm,
    position: "absolute",
    right: 0,
  },
  listItem: {
    alignItems: "center",
    borderColor: colors.graySep,
    borderRadius: rounded.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
  },
  listItemLink: {
    alignItems: "center",
    display: "flex",
    flex: "1",
    gap: spacing.xl,
    padding: spacing.md,
  },
  name: {
    alignItems: "center",
    display: "flex",
    gap: spacing.sm,
  },
  path: {
    color: colors.secondary,
    fontFamily: typeface.mono,
    fontSize: text.sm,
  },
  thumbnail: {
    borderRadius: rounded.md,
    display: "flex",
    position: "relative",
    width: "9rem",
  },
});

/** @package */
export function ProjectItem({ project }: { project: ProjectMeta }) {
  const t = useTranslations<T>();
  const { basePath, productionServerPort } = useLiqvidConfig();
  const selectedRootParams = useSelectedRootParameters();

  // Build combined params: root params as base, project params (first value) override
  const combinedParams = { ...selectedRootParams };
  if (project.parameters) {
    for (const [key, values] of Object.entries(project.parameters)) {
      if (!Object.hasOwn(combinedParams, key) && values.length > 0) {
        combinedParams[key] = values[0]!;
      }
    }
  }

  // Resolve parametrized title using combined params
  const resolvedTitle = project.title
    ? resolveParametrized(project.title, combinedParams)
    : undefined;

  const isDraft = resolveParametrized(project.draft, selectedRootParams);

  // Interpolate path parameters using selected root params + project params
  const interpolatedPath = interpolatePathParametersWithSelected(
    project.path,
    project.parameters,
    selectedRootParams,
  );

  // Build the preview URL with basePath if configured
  const previewPath = basePath
    ? `${basePath}/${interpolatedPath}`
    : `/${interpolatedPath}`;

  return (
    <ProjectPathProvider value={project.path}>
      <li sx={styles.listItem}>
        <a href={interpolatedPath} sx={styles.listItemLink}>
          <Thumbnail {...project} />
          <div>
            <span sx={styles.name}>
              {resolvedTitle ?? project.path}
              {isDraft && (
                <FileDashedIcon>
                  <title>{t.draft}</title>
                </FileDashedIcon>
              )}
            </span>
            <pre sx={styles.path}>{project.path}</pre>
          </div>
        </a>
        <div sx={styles.actions}>
          <MediaButton
            basePath={basePath}
            duration={project.duration}
            project={omit(project, ["duration"])}
            selectedRootParams={selectedRootParams}
          />
          <EmbedButton basePath={basePath} project={project} />
          <OpenInFinderButton />
          <PreviewButton
            href={`http://localhost:${productionServerPort}${previewPath}`}
          />
        </div>
      </li>
    </ProjectPathProvider>
  );
}

function Thumbnail({ aspectRatio, duration, path, socials }: ProjectMeta) {
  const thumbnailSx = stylex.props(styles.thumbnail);
  const rootParameters = useSelectedRootParameters();

  const previewImage = useMemo(() => {
    if (resolveParametrized(socials.liqvidStudio, rootParameters)) {
      const interpolatedPath = [
        path,
        ASSETS_DIR,
        ...Object.values(rootParameters),
        SOCIALS_DIR,
      ].join("/");
      return `light-dark(
  url("/api/liqvid/static/${interpolatedPath}/liqvid-studio-light.png"),
  url("/api/liqvid/static/${interpolatedPath}/liqvid-studio-dark.png")
)`;
    }
    if (socials.openGraph) {
      return `url("/api/liqvid/static/${path}/opengraph-image.png")`;
    }
  }, [path, socials, rootParameters]);

  return (
    <div
      className={thumbnailSx.className}
      style={{
        ...thumbnailSx.style,
        aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
        backgroundSize: "100% 100%",
        ...(previewImage
          ? {
              backgroundImage: previewImage,
            }
          : {}),
      }}
    >
      {duration && (
        <TimeDuration {...stylex.props(styles.duration)} value={duration} />
      )}
    </div>
  );
}
