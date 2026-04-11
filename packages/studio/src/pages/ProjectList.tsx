"use client";

import { Duration } from "@liqvid/duration";
import type { ProjectMeta, SerializedProjectMeta } from "@liqvid/schemas";
import { deserialize } from "@liqvid/ssr";
import { formatTime, formatTimeDuration, omit } from "@liqvid/utils";
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import Cookies from "universal-cookie";

import { COLLAPSED_FOLDERS_COOKIE, FOLDER_VIEW_COOKIE } from "../cookies";

import { OpenInFinderButton } from "./OpenInFinderButton";
import { ProductionLink } from "./ProductionLink";
import { ShareButton } from "./ShareButton";

import styles from "./ProjectList.module.css";

type ProjectListProps = {
  initialCollapsedFolders: string[];
  initialFolderView: boolean;
  productionServerPort: number;
  projects: Record<string, SerializedProjectMeta>;
};

interface FolderNode {
  name: string;
  projects: Array<[string, ProjectMeta]>;
  subfolders: Map<string, FolderNode>;
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
        const folderName = folderParts[i];
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
  maxAge: 60 * 60 * 24 * 365, // 1 year
  path: "/",
  sameSite: "lax" as const,
};

export function ProjectList({
  initialCollapsedFolders,
  initialFolderView,
  productionServerPort,
  projects: dehydratedProjects,
}: ProjectListProps) {
  const projects = useMemo(
    (): Record<string, ProjectMeta> =>
      deserialize(dehydratedProjects, {
        "@liqvid/duration": Duration.fromJSON,
      }),
    [dehydratedProjects],
  );
  const [folderView, setFolderView] = useState(initialFolderView);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => new Set(initialCollapsedFolders),
  );

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
    <>
      <div className={styles.viewToggle}>
        <label className={styles.toggleLabel}>
          <span>Folder view</span>
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
                      key={key}
                      productionServerPort={productionServerPort}
                      project={project}
                    />
                  ))}
                </ul>
              ) : (
                <FolderItem
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
              key={key}
              productionServerPort={productionServerPort}
              project={project}
            />
          ))}
        </ul>
      )}
    </>
  );
}

function FolderItem({
  collapsedFolders,
  folder,
  folderPath,
  onToggle,
  productionServerPort,
}: {
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
  productionServerPort,
  project,
}: {
  productionServerPort: number;
  project: ProjectMeta;
}) {
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
          duration={project.duration}
          productionServerPort={productionServerPort}
          project={omit(project, ["duration"])}
        />
        <OpenInFinderButton projectPath={project.path} />
        <ProductionLink
          href={`http://localhost:${productionServerPort}/${project.path}`}
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
        <time
          className={styles.duration}
          dateTime={formatTimeDuration(duration)}
        >
          {formatTime(duration)}
        </time>
      )}
    </div>
  );
}
