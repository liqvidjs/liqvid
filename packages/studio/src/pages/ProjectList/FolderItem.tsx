import type { ProjectMeta, RootParameters } from "@liqvid/schemas";
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";

import { colors, text } from "#_/design/tokens.stylex.js";

import { ProjectItem } from "./ProjectItem.tsx";

import styles from "./ProjectList.module.css";

const newStyles = stylex.create({
  chevron: {
    color: "light-dark(#6b7280, #9ca3af)",
    flexShrink: 0,
  },
  count: {
    backgroundColor: "light-dark(#e5e7eb, #4b5563)",
    borderRadius: "100%",
    color: "light-dark(#374151, #d1d5db)",
    fontSize: text.sm,
    fontWeight: 500,
    padding: "0.125rem 0.5rem",
  },
  icon: {
    color: colors.accentSolid,
    fill: colors.accentSolid,
    flexShrink: 0,
  },
  name: {
    flex: 1,
  },
});

export type FolderNode = {
  name: string;
  projects: Array<[string, ProjectMeta]>;
  subfolders: Map<string, FolderNode>;
};

/** @package */
export function FolderItem({
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
          <CaretDownIcon size={16} {...stylex.props(newStyles.chevron)} />
        ) : (
          <CaretRightIcon size={16} {...stylex.props(newStyles.chevron)} />
        )}
        <FolderIcon size={18} {...stylex.props(newStyles.icon)} />
        <span {...stylex.props(newStyles.name)}>{folderPath}</span>
        <span {...stylex.props(newStyles.count)}>{totalCount}</span>
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
