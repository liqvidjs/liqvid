"use client";

import { Duration } from "@liqvid/duration";
import type {
  ParameterValues,
  ProjectMeta,
  SerializedProjectMeta,
} from "@liqvid/schemas";
import { deserialize } from "@liqvid/ssr/serde";
import * as stylex from "@stylexjs/stylex";
import { RelativeDir } from "effect-paths";
import picomatch from "picomatch";
import { useState } from "react";
import Cookies from "universal-cookie";

import { useChannel } from "#_/components/WebSocketProvider";
import { useLiqvidConfig } from "#_/contexts/liqvid-config";
import { SelectedRootParametersProvider } from "#_/contexts/selected-root-parameters";
import {
  COLLAPSED_FOLDERS_COOKIE,
  FOLDER_VIEW_COOKIE,
  SHOW_HIDDEN_PROJECTS_COOKIE,
} from "#_/cookies";
import { spacing } from "#_/design/tokens.stylex";
import type { Localized } from "#_/i18n/shared";
import { Switch } from "#_/ui/Switch";
import { getDefaultParams } from "#_/utils/parameters-client";
import { useTranslations } from "#_/utils/react";

import { FolderItem, type FolderNode } from "./FolderItem.tsx";
import { ProjectItem } from "./ProjectItem.tsx";
import { RootParameterSelector } from "./RootParameterSelector.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({
  folderList: {
    columnGap: spacing.control,
    display: "flex",
    flexDirection: "column",
    rowGap: spacing.control,
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xl,
  },
  toggleLabel: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
    userSelect: "none",
  },
  viewToggle: {
    alignItems: "center",
    columnGap: spacing.xl,
    display: "flex",
    marginBottom: spacing.xl,
  },
});

export type ProjectListProps = {
  basePath: string;
  initialCollapsedFolders: readonly string[];
  initialFolderView: boolean;
  initialShowHiddenProjects: boolean;

  /** Initial selected root parameter values (from cookie) */
  initialSelectedRootParams: ParameterValues;

  projects: Readonly<Record<RelativeDir, SerializedProjectMeta>>;
};

const cookieOptions = {
  maxAge: Duration.inSeconds({ days: 365 }),
  path: "/",
  sameSite: "lax" as const,
};

export function ProjectListClient({
  basePath,
  initialCollapsedFolders,
  initialFolderView,
  initialShowHiddenProjects,
  initialSelectedRootParams,
  projects: dehydratedProjects,
}: ProjectListProps) {
  const t = useTranslations<T>();

  const { hideProjects, rootParameters } = useLiqvidConfig();
  const [projects, setProjects] = useState(
    (): Record<RelativeDir, ProjectMeta> =>
      deserialize(dehydratedProjects, {
        "@liqvid/duration": Duration.fromJSON,
      }),
  );
  const [folderView, setFolderView] = useState(initialFolderView);
  const [showHiddenProjects, setShowHiddenProjects] = useState(
    initialShowHiddenProjects,
  );
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(initialCollapsedFolders),
  );
  // Selected root parameter values - initialized from cookie or defaults
  const [selectedRootParams, setSelectedRootParams] = useState<ParameterValues>(
    () => {
      // Use initial values from cookie, fill in any missing with defaults
      const defaults = getDefaultParams(rootParameters);
      return { ...defaults, ...initialSelectedRootParams };
    },
  );

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

  function handleShowHiddenProjectsChange(enabled: boolean) {
    setShowHiddenProjects(enabled);
    const cookies = new Cookies();
    cookies.set(SHOW_HIDDEN_PROJECTS_COOKIE, enabled, cookieOptions);
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

  const folderTree = buildFolderTree(
    showHiddenProjects ? projects : omitHiddenProjects(projects, hideProjects),
  );

  return (
    <SelectedRootParametersProvider value={selectedRootParams}>
      {/* Root parameter selector at top of project list */}
      {hasRootParameters && (
        <RootParameterSelector onRootParamsChange={setSelectedRootParams} />
      )}

      <div sx={styles.viewToggle}>
        <label sx={styles.toggleLabel}>
          <span>{t.folderView}</span>
          <Switch
            checked={folderView}
            onClick={() => handleFolderViewChange(!folderView)}
          />
        </label>
        {hideProjects.length > 0 && (
          <label sx={styles.toggleLabel}>
            <span>{t.showHiddenProjects}</span>
            <Switch
              checked={showHiddenProjects}
              onClick={() =>
                handleShowHiddenProjectsChange(!showHiddenProjects)
              }
            />
          </label>
        )}
      </div>

      {folderView ? (
        <div sx={styles.folderList}>
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
                <ul key="__root__" sx={styles.projectList}>
                  {folder.projects.map(([key, project]) => (
                    <ProjectItem key={key} project={project} />
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
                />
              ),
            )}
        </div>
      ) : (
        <ul sx={styles.projectList}>
          {sortedProjects.map(([key, project]) => (
            <ProjectItem key={key} project={project} />
          ))}
        </ul>
      )}
    </SelectedRootParametersProvider>
  );
}

function omitHiddenProjects(
  projects: Readonly<Record<RelativeDir, ProjectMeta>>,
  patterns: readonly string[],
): Readonly<Record<RelativeDir, ProjectMeta>> {
  const matchers = patterns.map((pattern) => picomatch(pattern));
  return Object.fromEntries(
    Object.entries(projects).filter(
      ([, project]) => !matchers.some((matches) => matches(project.path)),
    ),
  );
}

/**
 * Build a folder tree from project paths.
 * Projects are grouped by their path prefix (directory structure).
 */
function buildFolderTree(
  projects: Readonly<Record<string, ProjectMeta>>,
): Map<string, FolderNode> {
  const root = new Map<RelativeDir, FolderNode>();

  const sortedProjects = Object.entries(projects).sort(([, a], [, b]) =>
    a.path.localeCompare(b.path),
  );

  for (const [key, project] of sortedProjects) {
    const parts = (project.path.split("/") as RelativeDir[]).filter(Boolean);

    if (parts.length === 1) {
      // Top-level project (no folder)
      const folderName = RelativeDir("");
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

  return collapseSingleChildFolders(root);
}

/**
 * Collapse directory chains that do not contain projects of their own.
 * For example, `a/b/c` and `a/b/d` become `a/b` with `c` and `d` below it.
 */
function collapseSingleChildFolders(
  folders: ReadonlyMap<RelativeDir, FolderNode>,
): Map<RelativeDir, FolderNode> {
  const collapsed = new Map<RelativeDir, FolderNode>();

  for (const [folderName, folder] of folders) {
    let name = folderName;
    let current: FolderNode = {
      ...folder,
      subfolders: collapseSingleChildFolders(folder.subfolders),
    };

    while (current.projects.length === 0 && current.subfolders.size === 1) {
      const [childName, child] = current.subfolders.entries().next().value!;
      name = RelativeDir(`${name}/${childName}`);
      current = child;
    }

    collapsed.set(name, { ...current, name });
  }

  return collapsed;
}
