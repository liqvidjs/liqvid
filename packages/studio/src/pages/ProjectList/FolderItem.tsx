import type { ProjectMeta } from "@liqvid/schemas";
import {
  CaretDownIcon,
  CaretRightIcon,
  FolderIcon,
} from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useId } from "react";

import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";

import { ProjectItem } from "./ProjectItem.tsx";

export type FolderNode = {
  name: string;
  projects: Array<[string, ProjectMeta]>;
  subfolders: Map<string, FolderNode>;
};

const styles = stylex.create({
  chevron: {
    color: colors.softControl,
    flexShrink: 0,
  },
  count: {
    alignItems: "center",
    aspectRatio: "square",
    backgroundColor: colors.graySep,
    borderRadius: radii.circle,
    color: colors.secondary,
    display: "flex",
    fontSize: text.sm,
    fontWeight: 500,
    height: dims.icon,
    justifyContent: "center",
    paddingBlock: spacing.sm,
    paddingInline: spacing.md,
    width: dims.icon,
  },
  folder: {
    borderColor: colors.folderBorder,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    overflow: "hidden",
  },
  folderHeader: {
    alignItems: "center",
    backgroundColor: {
      ":hover": colors.folderHeaderBgHover,
      default: colors.folderHeaderBg,
    },
    borderStyle: "none",
    cursor: "pointer",
    display: "flex",
    fontFamily: typeface.mono,
    fontSize: text.md,
    gap: spacing.md,
    paddingBlock: spacing.lg,
    paddingInline: spacing.xl,
    textAlign: "left",
    transition: "background-color 0.15s",
    width: "100%",
  },
  folderProjectList: {
    borderColor: colors.folderBorder,
    borderTopStyle: "solid",
    borderTopWidth: dims.sep,
  },
  icon: {
    color: colors.accentSolid,
    fill: colors.accentSolid,
    flexShrink: 0,
  },
  name: {
    flex: "1",
  },
  nestedFolder: {
    borderRadius: radii.none,
    borderStyle: "none",
  },
  nestedFolderHeader: {
    backgroundColor: {
      ":hover": colors.nestedFolderHeaderBg,
      default: colors.transparent,
    },
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xl,
  },
});

/** @package */
export function FolderItem({
  basePath,
  collapsedFolders,
  folder,
  folderPath,
  onToggle,
  nested = false,
}: {
  basePath: string;
  collapsedFolders: Set<string>;
  folder: FolderNode;
  folderPath: string;
  onToggle: (folderPath: string, expanded: boolean) => void;
  nested?: boolean;
}) {
  const expanded = !collapsedFolders.has(folderPath);
  const totalCount = countTotalProjects(folder);
  const sortedSubfolders = Array.from(folder.subfolders.entries()).sort(
    ([a], [b]) => a.localeCompare(b),
  );

  const id = useId();

  return (
    <div sx={[styles.folder, nested && styles.nestedFolder]}>
      {/** biome-ignore lint/correctness/noRestrictedElements: different kind of button */}
      <button
        aria-controls={id}
        aria-expanded={expanded}
        onClick={() => onToggle(folderPath, !expanded)}
        sx={[styles.folderHeader, nested && styles.nestedFolderHeader]}
        type="button"
      >
        {expanded ? (
          <CaretDownIcon size={16} {...stylex.props(styles.chevron)} />
        ) : (
          <CaretRightIcon size={16} {...stylex.props(styles.chevron)} />
        )}
        <FolderIcon size={18} {...stylex.props(styles.icon)} />
        <span sx={styles.name}>{folderPath}</span>
        <span sx={styles.count}>{totalCount}</span>
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
          />
        ))}
        {/* Then render projects in this folder */}
        {folder.projects.length > 0 && (
          <ul sx={[styles.projectList, styles.folderProjectList]}>
            {folder.projects.map(([key, project]) => (
              <ProjectItem key={key} project={project} />
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
