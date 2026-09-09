import * as stylex from "@stylexjs/stylex";

import { colors, dims, radii, spacing, text } from "#_/design/tokens.stylex.js";

export const projectListStyles = stylex.create({
  actions: {
    alignItems: "center",
    columnGap: "0.2em",
    display: "flex",
    paddingBlock: spacing.rem05,
    paddingInline: spacing.rem1,
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
    fontWeight: 500,
    gap: spacing.md,
    paddingBlock: spacing.rem075,
    paddingInline: spacing.rem1,
    textAlign: "left",
    transition: "background-color 0.15s",
    width: "100%",
  },
  folderList: {
    columnGap: "10rem",
    display: "flex",
    flexDirection: "column",
    rowGap: "10rem",
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
  rootParameterField: {
    alignItems: "center",
    display: "flex",
    gap: spacing.md,
  },
  rootParameterLabel: {
    color: colors.grayDim,
    fontSize: text.rem08125,
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
    borderWidth: dims.sep,
    color: colors.grayNormal,
    cursor: "pointer",
    fontSize: text.rem08125,
    outline: {
      ":focus": "none",
      default: null,
    },
    paddingBlock: spacing.rem0375,
    paddingInline: spacing.rem0625,
  },
  rootParameterSelector: {
    alignItems: "center",
    backgroundColor: colors.graySubtle,
    borderColor: colors.graySep,
    borderRadius: radii.lg,
    borderStyle: "solid",
    borderWidth: dims.sep,
    display: "flex",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.xl,
    paddingBlock: spacing.rem075,
    paddingInline: spacing.rem1,
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
    borderRadius: radii.full,
    color: colors.grayDim,
    fontSize: text.sm,
    fontWeight: 500,
    paddingBlock: spacing.rem0125,
    paddingInline: spacing.rem05,
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
