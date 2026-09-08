import * as stylex from "@stylexjs/stylex";

import { colors, radii, spacing, text } from "#_/design/tokens.stylex.js";

export const projectListStyles = stylex.create({
  actions: {
    alignItems: "center",
    display: "flex",
    gap: "0.2em",
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
  },
  duration: {
    backgroundColor: "#0007",
    borderTopLeftRadius: '2px',
    borderTopRightRadius: '0',
    borderBottomRightRadius: '0',
    borderBottomLeftRadius: '0',
    bottom: 0,
    color: "#fff",
    fontSize: text.xs,
    lineHeight: 1,
    padding: '4px',
    position: "absolute",
    right: 0,
  },
  folder: {
    borderColor: "light-dark(#e5e7eb, #374151)",
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    overflow: "hidden",
  },
  folderHeader: {
    alignItems: "center",
    backgroundColor: {
      ":hover": "light-dark(#f3f4f6, #374151)",
      default: "light-dark(#f9fafb, #1f2937)",
    },
    borderStyle: "none",
    cursor: "pointer",
    display: "flex",
    fontWeight: 500,
    gap: spacing.md,
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
    textAlign: "left",
    transition: "background-color 0.15s",
    width: "100%",
  },
  folderList: {
    display: "flex",
    flexDirection: "column",
    gap: "10rem",
  },
  folderProjectList: {
    borderTopColor: "light-dark(#e5e7eb, #374151)",
    borderTopStyle: "solid",
    borderTopWidth: "1px",
  },
  listItem: {
    alignItems: "center",
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    display: "flex",
  },
  listItemLink: {
    alignItems: "center",
    display: "flex",
    flex: "1",
    gap: spacing.xl,
    padding: spacing.md,
  },
  nestedFolder: {
    borderRadius: 0,
    borderStyle: "none",
  },
  nestedFolderHeader: {
    backgroundColor: {
      ":hover": "light-dark(#f9fafb, #1f2937)",
      default: "transparent",
    },
  },
  projectList: {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xl,
  },
  rootParameterField: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  rootParameterLabel: {
    color: colors.grayDim,
    fontSize: "0.8125rem",
    fontWeight: 500,
    textTransform: "capitalize",
  },
  rootParameterSelect: {
    backgroundColor: colors.grayApp,
    borderColor: {
      ":focus": colors.accentSolid,
      default: colors.graySep,
    },
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: "1px",
    color: colors.grayNormal,
    cursor: "pointer",
    fontSize: "0.8125rem",
    outline: {
      ":focus": "none",
    },
    paddingBlock: '0.375rem',
    paddingInline: '0.625rem',
  },
  rootParameterSelector: {
    alignItems: "center",
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: "1px",
    display: "flex",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingBlock: '0.75rem',
    paddingInline: '1rem',
  },
  thumbnail: {
    borderRadius: radii.md,
    display: "flex",
    position: "relative",
    width: "9rem",
  },
  toggleLabel: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
    userSelect: "none",
  },
  viewToggle: {
    marginBottom: spacing.xl,
  },
});

/**
 * Styles for FolderItem sub-elements (chevron, icon, name, count).
 */
export const folderItemStyles = stylex.create({
  chevron: {
    color: colors.grayDim,
    flexShrink: 0,
  },
  count: {
    backgroundColor: colors.graySep,
    borderRadius: "100%",
    color: colors.grayDim,
    fontSize: text.sm,
    fontWeight: 500,
    paddingBlock: '0.125rem',
    paddingInline: '0.5rem',
  },
  icon: {
    color: colors.accentSolid,
    fill: colors.accentSolid,
    flexShrink: 0,
  },
  name: {
    flex: "1",
  },
});
