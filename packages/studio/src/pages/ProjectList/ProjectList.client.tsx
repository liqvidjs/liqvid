"use client";

import { Duration } from "@liqvid/duration";
import type {
  ProjectMeta,
  RootParameters,
  SerializedProjectMeta,
} from "@liqvid/schemas";
import { deserialize } from "@liqvid/ssr/serde";
import { ProjectPathProvider } from "@liqvid/studio-plugin-api";
import { omit } from "@liqvid/utils";
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import type { RelativeDir } from "effect-paths";
import { useId, useState } from "react";
import Cookies from "universal-cookie";

import { useChannel } from "#_/components/WebSocketProvider.js";
import { COLLAPSED_FOLDERS_COOKIE, FOLDER_VIEW_COOKIE } from "#_/cookies.js";
import { TimeDuration } from "#_/ui/Time.js";
import { TranslationProvider } from "#_/utils/react.js";

import { EmbedButton } from "./EmbedButton.tsx";
import { MediaButton } from "./MediaDialog.tsx";
import { OpenInFinderButton } from "./OpenInFinderButton.tsx";
import {
  getDefaultParams,
  RootParameterSelector,
} from "./ParameterSelector.tsx";
import { PreviewButton } from "./ProductionLink.tsx";

import styles from "./ProjectList.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export type ProjectListProps = {
  basePath: string;
  initialCollapsedFolders: string[];
  initialFolderView: boolean;
  /** Initial selected root parameter values (from cookie) */
  initialSelectedRootParams: Record<string, string>;
  productionServerPort: number;
  projects: Record<RelativeDir, SerializedProjectMeta>;
  rootParameters: RootParameters;
  t: T;
};

interface FolderNode {
  name: string;
  projects: Array<[string, ProjectMeta]>;
  subfolders: Map<string, FolderNode>;
}

/**
 * Count total projects in a folder including all subfolders.
 */
function countTotalProjects(folder: FolderNode): number {
  let count = folder.projects.length;
  for (const subfolder of folder.subfolders.values()) {
    count += countTotalProjects(subfolder);
  }
  return count;
}

const cookieOptions = {
  maxAge: Duration.inSeconds({ days: 365 }),
  path: "/",
  sameSite: "lax" as const,
};

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

export function ProjectListClient({
  basePath,
  initialCollapsedFolders,
  initialFolderView,
  initialSelectedRootParams,
  productionServerPort,
  projects: dehydratedProjects,
  rootParameters,
  t,
}: ProjectListProps) {
  const [projects, setProjects] = useState(
    (): Record<RelativeDir, ProjectMeta> =>
      deserialize(dehydratedProjects, {
        "@liqvid/duration": Duration.fromJSON,
      }),
  );
  const [folderView, setFolderView] = useState(initialFolderView);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(initialCollapsedFolders),
  );
  // Selected root parameter values - initialized from cookie or defaults
  const [selectedRootParams, setSelectedRootParams] = useState<
    Record<string, string>
  >(() => {
    // Use initial values from cookie, fill in any missing with defaults
    const defaults = getDefaultParams(rootParameters);
    return { ...defaults, ...initialSelectedRootParams };
  });

  // Check if we have any root parameters to display
  const hasRootParameters = Object.values(rootParameters).some(
    (values) => values.length > 0,
  );

  useChannel("projects", {
    deleteProject: (data) => {
      setProjects((prev) => {
        const next = { ...prev };
        delete next[data.path];
        return next;
      });
    },
    newProject: (data) => {
      setProjects((prev) => ({ ...prev, [data.path]: data }));
    },
    updateProject: (data) => {
      setProjects((prev) => ({ ...prev, [data.path]: data }));
    },
  });

  function handleFolderViewChange(enabled: boolean) {
    setFolderView(enabled);
    const cookies = new Cookies();
    cookies.set(FOLDER_VIEW_COOKIE, enabled, cookieOptions);
  }

  function handleFolderToggle(folderName: string, expanded: boolean) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (expanded) {
        next.delete(folderName);
      } else {
        next.add(folderName);
      }
      const cookies = new Cookies();
      cookies.set(
        COLLAPSED_FOLDERS_COOKIE,
        JSON.stringify([...next]),
        cookieOptions,
      );
      return next;
    });
  }

  const sortedProjects = Object.entries(projects).sort(([, a], [, b]) =>
    a.path.localeCompare(b.path),
  );

  const folderTree = buildFolderTree(projects);

  return (
    <TranslationProvider t={t}>
      {/* Root parameter selector at top of project list */}
      {hasRootParameters && (
        <RootParameterSelector
          onRootParamsChange={setSelectedRootParams}
          rootParameters={rootParameters}
          selectedRootParams={selectedRootParams}
        />
      )}

      <div className={styles.viewToggle}>
        <label className={styles.toggleLabel}>
          <span>{t.folderView}</span>
          {/** biome-ignore lint/correctness/noRestrictedElements: different kind of button */}
          <button
            aria-checked={folderView}
            className={styles.toggleSwitch}
            data-state={folderView ? "checked" : "unchecked"}
            onClick={() => handleFolderViewChange(!folderView)}
            role="switch"
            type="button"
          >
            <span className={styles.toggleThumb} />
          </button>
        </label>
      </div>

      {folderView ? (
        <div className={styles.folderList}>
          {Array.from(folderTree.entries())
            .sort(([a], [b]) => {
              // Empty folder name (root projects) should come last
              if (a === "") return 1;
              if (b === "") return -1;
              return a.localeCompare(b);
            })
            .map(([folderName, folder]) =>
              folderName === "" ? (
                // Root-level projects (no folder)
                <ul className={styles.projectList} key="__root__">
                  {folder.projects.map(([key, project]) => (
                    <ProjectItem
                      basePath={basePath}
                      key={key}
                      productionServerPort={productionServerPort}
                      project={project}
                      rootParameters={rootParameters}
                      selectedRootParams={selectedRootParams}
                    />
                  ))}
                </ul>
              ) : (
                <FolderItem
                  basePath={basePath}
                  collapsedFolders={collapsedFolders}
                  folder={folder}
                  folderPath={folderName}
                  key={folderName}
                  onToggle={handleFolderToggle}
                  productionServerPort={productionServerPort}
                  rootParameters={rootParameters}
                  selectedRootParams={selectedRootParams}
                />
              ),
            )}
        </div>
      ) : (
        <ul className={styles.projectList}>
          {sortedProjects.map(([key, project]) => (
            <ProjectItem
              basePath={basePath}
              key={key}
              productionServerPort={productionServerPort}
              project={project}
              rootParameters={rootParameters}
              selectedRootParams={selectedRootParams}
            />
          ))}
        </ul>
      )}
    </TranslationProvider>
  );
}

function FolderItem({
  basePath,
  collapsedFolders,
  folder,
  folderPath,
  onToggle,
  productionServerPort,
  rootParameters,
  selectedRootParams,
}: {
  basePath: string;
  collapsedFolders: Set<string>;
  folder: FolderNode;
  folderPath: string;
  rootParameters: RootParameters;
  selectedRootParams: Record<string, string>;
  onToggle: (folderPath: string, expanded: boolean) => void;
  productionServerPort: number;
}) {
  const expanded = !collapsedFolders.has(folderPath);
  const totalCount = countTotalProjects(folder);
  const sortedSubfolders = Array.from(folder.subfolders.entries()).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  const id = useId();

  return (
    <div className={styles.folder}>
      {/** biome-ignore lint/correctness/noRestrictedElements: different kind of button */}
      <button
        aria-controls={id}
        aria-expanded={expanded}
        className={styles.folderHeader}
        onClick={() => onToggle(folderPath, !expanded)}
        type="button"
      >
        {expanded ? (
          <CaretDownIcon className={styles.folderChevron} size={16} />
        ) : (
          <CaretRightIcon className={styles.folderChevron} size={16} />
        )}
        <FolderIcon className={styles.folderIcon} fill="" size={18} />
        <span className={styles.folderName}>{folderPath}</span>
        <span className={styles.folderCount}>{totalCount}</span>
      </button>

      <div hidden={!expanded} id={id}>
        {/* Render subfolders first */}
        {sortedSubfolders.map(([subfolderName, subfolder]) => (
          <FolderItem
            basePath={basePath}
            collapsedFolders={collapsedFolders}
            folder={subfolder}
            folderPath={`${folderPath}/${subfolderName}`}
            key={subfolderName}
            onToggle={onToggle}
            productionServerPort={productionServerPort}
            rootParameters={rootParameters}
            selectedRootParams={selectedRootParams}
          />
        ))}
        {/* Then render projects in this folder */}
        {folder.projects.length > 0 && (
          <ul className={styles.projectList}>
            {folder.projects.map(([key, project]) => (
              <ProjectItem
                basePath={basePath}
                key={key}
                productionServerPort={productionServerPort}
                project={project}
                rootParameters={rootParameters}
                selectedRootParams={selectedRootParams}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ProjectItem({
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
      <li>
        <a href={interpolatedPath}>
          <Thumbnail {...project} />
          <div className="flex flex-col">
            {project.name}
            <pre className="text-sm">{project.path}</pre>
          </div>
        </a>
        <div className={styles.actions}>
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
  return (
    <div
      className={styles.thumbnail}
      style={{
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
        <TimeDuration className={styles.duration} value={duration} />
      )}
    </div>
  );
}

/**
 * Build a folder tree from project paths.
 * Projects are grouped by their path prefix (directory structure).
 */
function buildFolderTree(
  projects: Record<string, ProjectMeta>,
): Map<string, FolderNode> {
  const root = new Map<string, FolderNode>();

  const sortedProjects = Object.entries(projects).sort(([, a], [, b]) =>
    a.path.localeCompare(b.path),
  );

  for (const [key, project] of sortedProjects) {
    const parts = project.path.split("/").filter(Boolean);

    if (parts.length === 1) {
      // Top-level project (no folder)
      const folderName = "";
      if (!root.has(folderName)) {
        root.set(folderName, {
          name: folderName,
          projects: [],
          subfolders: new Map(),
        });
      }
      root.get(folderName)!.projects.push([key, project]);
    } else {
      // Project in a nested folder - traverse/create the folder tree
      // The last part is the project name, so we only use parts[0..n-1] as folders
      const folderParts = parts.slice(0, -1);

      let currentLevel = root;
      for (let i = 0; i < folderParts.length; i++) {
        const folderName = folderParts[i]!;
        if (!currentLevel.has(folderName)) {
          currentLevel.set(folderName, {
            name: folderName,
            projects: [],
            subfolders: new Map(),
          });
        }
        const folder = currentLevel.get(folderName)!;
        if (i === folderParts.length - 1) {
          // This is the deepest folder - add the project here
          folder.projects.push([key, project]);
        } else {
          // Continue traversing deeper
          currentLevel = folder.subfolders;
        }
      }
    }
  }

  return root;
}
