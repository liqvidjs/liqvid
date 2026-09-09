import {
  type ProjectMeta,
  type RootParameters,
  resolveParametrizedString,
} from "@liqvid/schemas";
import { ProjectPathProvider } from "@liqvid/studio-plugin-api";
import { omit } from "@liqvid/utils";
import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";
import { TimeDuration } from "#_/ui/Time.js";

import { EmbedButton } from "./EmbedButton.tsx";
import { MediaButton } from "./MediaDialog.tsx";
import { OpenInFinderButton } from "./OpenInFinderButton.tsx";
import { PreviewButton } from "./ProductionLink.tsx";

const styles = stylex.create({
  actions: {
    alignItems: "center",
    columnGap: "0.2em",
    display: "flex",
    paddingBlock: spacing.md,
    paddingInline: spacing.xl,
    rowGap: "0.2em",
  },
  duration: {
    backgroundColor: colors.overlayDark,
    borderBottomLeftRadius: "0",
    borderBottomRightRadius: "0",
    borderTopLeftRadius: "2px",
    borderTopRightRadius: "0",
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
  thumbnail: {
    borderRadius: radii.md,
    display: "flex",
    position: "relative",
    width: "9rem",
  },
});

/** @package */
export function ProjectItem({
  basePath,
  productionServerPort,
  project,
  rootParameters,
  selectedRootParams,
}: {
  basePath: string;
  productionServerPort: number;
  project: ProjectMeta;
  rootParameters: RootParameters;
  selectedRootParams: Record<string, string>;
}) {
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
    ? resolveParametrizedString(project.title, combinedParams)
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
          <div className="flex flex-col">
            {resolvedTitle ?? project.path}
            <pre className="text-sm">{project.path}</pre>
          </div>
        </a>
        <div sx={styles.actions}>
          <MediaButton
            basePath={basePath}
            duration={project.duration}
            productionServerPort={productionServerPort}
            project={omit(project, ["duration"])}
            rootParameters={rootParameters}
            selectedRootParams={selectedRootParams}
          />
          <EmbedButton
            basePath={basePath}
            productionServerPort={productionServerPort}
            project={project}
          />
          <OpenInFinderButton />
          <PreviewButton
            href={`http://localhost:${productionServerPort}${previewPath}`}
          />
        </div>
      </li>
    </ProjectPathProvider>
  );
}

function Thumbnail({ aspectRatio, duration, path, openGraph }: ProjectMeta) {
  const thumbnailSx = stylex.props(styles.thumbnail);
  return (
    <div
      className={thumbnailSx.className}
      style={{
        ...thumbnailSx.style,
        aspectRatio: `${aspectRatio.width} / ${aspectRatio.height}`,
        backgroundSize: "100% 100%",
        ...(openGraph
          ? {
              backgroundImage: `url("/api/liqvid/static/${path}/opengraph-image.png")`,
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

/**
 * Interpolate path parameters (like `[lang]`) using the selected root parameter values.
 * Project-level parameters override root parameters.
 * @param path - The path containing parameters (e.g., `/[lang]/gng/1-cg/1-spaces/1-intro`)
 * @param projectParameters - Parameters defined in the project's project.json (if any)
 * @param selectedRootParams - Currently selected root parameter values
 * @returns The interpolated path with parameter values
 */
function interpolatePathParametersWithSelected(
  path: string,
  projectParameters: Record<string, readonly string[]> | undefined,
  selectedRootParams: Record<string, string>,
): string {
  // Match all path parameters like [lang], [id], etc.
  return path.replace(/\[([^\]]+)\]/g, (match, paramName) => {
    // First, try project-level parameters (use first value as default)
    if (projectParameters?.[paramName]?.length) {
      return projectParameters[paramName][0]!;
    }
    // Fall back to selected root parameter value
    if (selectedRootParams[paramName]) {
      return selectedRootParams[paramName];
    }
    // If no value found, keep the original
    return match;
  });
}
