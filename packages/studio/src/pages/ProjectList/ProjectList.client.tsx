"use client";

import { Duration } from "@liqvid/duration";
import type { ProjectMeta, SerializedProjectMeta } from "@liqvid/schemas";
import { deserialize } from "@liqvid/ssr";
import { omit } from "@liqvid/utils";
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import { RelativeDir } from "effect-paths";
import { useState } from "react";
import Cookies from "universal-cookie";

import { useChannel } from "../../components/WebSocketProvider.tsx";
import { COLLAPSED_FOLDERS_COOKIE, FOLDER_VIEW_COOKIE } from "../../cookies.ts";
import { TimeDuration } from "../../ui/Time.tsx";
import { TranslationProvider } from "../../utils/react.tsx";

import { EmbedButton } from "./EmbedButton.tsx";
import { OpenInFinderButton } from "./OpenInFinderButton.tsx";
import { ProductionLink } from "./ProductionLink.tsx";
import { ShareButton } from "./ShareButton.tsx";

import styles from "./ProjectList.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export type ProjectListProps = {
  basePath: string;
  initialCollapsedFolders: string[];
  initialFolderView: boolean;
  productionServerPort: number;
  projects: Record<RelativeDir, SerializedProjectMeta>;
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

export function ProjectListClient({
  basePath,
  initialCollapsedFolders,
  initialFolderView,
  productionServerPort,
  projects: dehydratedProjects,
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
      <div className={styles.viewToggle}>
        <label className={styles.toggleLabel}>
          <span>{t.folderView}</span>
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
}: {
  basePath: string;
  collapsedFolders: Set<string>;
  folder: FolderNode;
  folderPath: string;
  onToggle: (folderPath: string, expanded: boolean) => void;
  productionServerPort: number;
}) {
  const expanded = !collapsedFolders.has(folderPath);
  const totalCount = countTotalProjects(folder);
  const sortedSubfolders = Array.from(folder.subfolders.entries()).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  return (
    <div className={styles.folder}>
      <button
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
      {expanded && (
        <>
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
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function ProjectItem({
  basePath,
  productionServerPort,
  project,
}: {
  basePath: string;
  productionServerPort: number;
  project: ProjectMeta;
}) {
  // Build the preview URL with basePath if configured
  const previewPath = basePath
    ? `${basePath}/${project.path}`
    : `/${project.path}`;

  return (
    <li>
      <a href={project.path}>
        <Thumbnail {...project} />
        <div className="flex flex-col">
          {project.name}
          <pre className="text-sm">{project.path}</pre>
        </div>
      </a>
      <div className={styles.actions}>
        <ShareButton
          basePath={basePath}
          duration={project.duration}
          productionServerPort={productionServerPort}
          project={omit(project, ["duration"])}
        />
        <EmbedButton
          basePath={basePath}
          productionServerPort={productionServerPort}
          project={project}
        />
        <OpenInFinderButton projectPath={RelativeDir(project.path)} />
        <ProductionLink
          href={`http://localhost:${productionServerPort}${previewPath}`}
        />
      </div>
    </li>
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
              backgroundImage: `url("/${path}/opengraph-image.png")`,
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
