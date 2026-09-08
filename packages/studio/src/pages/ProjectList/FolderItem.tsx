import type { ProjectMeta, RootParameters } from "@liqvid/schemas";
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";

import { ProjectItem } from "./ProjectItem.tsx";
import {
  folderItemStyles,
  projectListStyles as styles,
} from "./projectList.sx.ts";

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
  nested = false,
}: {
  basePath: string;
  collapsedFolders: Set<string>;
  folder: FolderNode;
  folderPath: string;
  rootParameters: RootParameters;
  selectedRootParams: Record<string, string>;
  onToggle: (folderPath: string, expanded: boolean) => void;
  productionServerPort: number;
  nested?: boolean;
}) {
  const expanded = !collapsedFolders.has(folderPath);
  const totalCount = countTotalProjects(folder);
  const sortedSubfolders = Array.from(folder.subfolders.entries()).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  const id = useId();

  return (
    <div {...stylex.props(styles.folder, nested && styles.nestedFolder)}>
      {/** biome-ignore lint/correctness/noRestrictedElements: different kind of button */}
      <button
        aria-controls={id}
        aria-expanded={expanded}
        {...stylex.props(
          styles.folderHeader,
          nested && styles.nestedFolderHeader,
        )}
        onClick={() => onToggle(folderPath, !expanded)}
        type="button"
      >
        {expanded ? (
          <CaretDownIcon
            size={16}
            {...stylex.props(folderItemStyles.chevron)}
          />
        ) : (
          <CaretRightIcon
            size={16}
            {...stylex.props(folderItemStyles.chevron)}
          />
        )}
        <FolderIcon size={18} {...stylex.props(folderItemStyles.icon)} />
        <span {...stylex.props(folderItemStyles.name)}>{folderPath}</span>
        <span {...stylex.props(folderItemStyles.count)}>{totalCount}</span>
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
            nested
            onToggle={onToggle}
            productionServerPort={productionServerPort}
            rootParameters={rootParameters}
            selectedRootParams={selectedRootParams}
          />
        ))}
        {/* Then render projects in this folder */}
        {folder.projects.length > 0 && (
          <ul {...stylex.props(styles.projectList, styles.folderProjectList)}>
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
