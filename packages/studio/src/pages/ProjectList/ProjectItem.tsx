import type { ProjectMeta } from "@liqvid/schemas";
import { ProjectPathProvider } from "@liqvid/studio-plugin-api";
import { omit } from "@liqvid/utils";
import * as stylex from "@stylexjs/stylex";
import { useMemo } from "react";

import { useLiqvidConfig } from "#_/contexts/liqvid-config.js";
import { useSelectedRootParameters } from "#_/contexts/selected-root-parameters.js";
import { ASSETS_DIR, SOCIALS_DIR } from "#_/conventions.mjs";
import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import { TimeDuration } from "#_/ui/Time.js";
import {
  interpolatePathParametersWithSelected,
  resolveParametrized,
} from "#_/utils/parameters-client.mjs";

import { EmbedButton } from "./EmbedButton.tsx";
import { MediaButton } from "./MediaDialog/client.tsx";
import { OpenInFinderButton } from "./OpenInFinderButton.tsx";
import { PreviewButton } from "./ProductionLink.tsx";

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
    borderBottomLeftRadius: radii.none,
    borderBottomRightRadius: radii.none,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.none,
    bottom: 0,
    color: colors.white,
    fontSize: text.xs,
    lineHeight: 1,
    padding: spacing.md,
    position: "absolute",
    right: 0,
  },
  listItem: {
    alignItems: "center",
    borderColor: colors.graySep,
    borderRadius: radii.md,
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
    display: "block",
  },
  path: {
    color: colors.secondary,
    fontFamily: typeface.mono,
    fontSize: text.sm,
  },
  thumbnail: {
    borderRadius: radii.md,
    display: "flex",
    position: "relative",
    width: "9rem",
  },
});

/** @package */
export function ProjectItem({ project }: { project: ProjectMeta }) {
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
            <span sx={styles.name}>{resolvedTitle ?? project.path}</span>
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
