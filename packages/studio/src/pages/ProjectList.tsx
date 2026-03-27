"use client";

import { Duration } from "@liqvid/duration";
import { deserialize } from "@liqvid/ssr";
import { formatTime, formatTimeDuration } from "@liqvid/utils";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { useMemo, useState } from "react";
import Cookies from "universal-cookie";

import { COLLAPSED_FOLDERS_COOKIE, FOLDER_VIEW_COOKIE } from "../cookies";
import type {
  ProjectMeta,
  SerializedProjectMeta,
} from "../schemas/project.mts";

import { ProductionLink } from "./ProductionLink";

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
      // Project in a folder - use first path segment as folder
      const folderName = parts[0];
      if (!root.has(folderName)) {
        root.set(folderName, {
          name: folderName,
          projects: [],
          subfolders: new Map(),
        });
      }
      root.get(folderName)!.projects.push([key, project]);
    }
  }

  return root;
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
                  expanded={!collapsedFolders.has(folderName)}
                  folder={folder}
                  key={folderName}
                  onToggle={(expanded) =>
                    handleFolderToggle(folderName, expanded)
                  }
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
  expanded,
  folder,
  onToggle,
  productionServerPort,
}: {
  expanded: boolean;
  folder: FolderNode;
  onToggle: (expanded: boolean) => void;
  productionServerPort: number;
}) {
  return (
    <div className={styles.folder}>
      <button
        className={styles.folderHeader}
        onClick={() => onToggle(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className={styles.folderChevron} size={16} />
        ) : (
          <ChevronRight className={styles.folderChevron} size={16} />
        )}
        <Folder className={styles.folderIcon} fill="" size={18} />
        <span className={styles.folderName}>{folder.name}</span>
        <span className={styles.folderCount}>{folder.projects.length}</span>
      </button>
      {expanded && (
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
