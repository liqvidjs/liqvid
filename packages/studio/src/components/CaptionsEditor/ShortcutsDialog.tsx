"use client";

import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";

import {
  colors,
  dims,
  radii,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import {
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "#_/ui/Dialog.js";

import {
  defaultShortcuts,
  formatShortcut,
  type Shortcuts,
  shortcutList,
} from "./shortcuts.ts";

import type Translations from "./.translations/en.json";

type T = Localized<typeof Translations>;

const styles = stylex.create({
  closeButton: {
    marginLeft: spacing.auto,
  },

  kbd: {
    backgroundColor: colors.graySubtle,
    borderBottomWidth: spacing.sm,
    borderColor: colors.graySep,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    color: colors.grayNormal,
    display: "inline-block",
    fontFamily: typeface.uiMono,
    fontSize: text.md,
    lineHeight: 1.4,
    minWidth: "1.2em",
    paddingBlock: spacing.sm,
    paddingInline: spacing.sm,
    textAlign: "center",
  },

  keys: {
    textAlign: "right",
    whiteSpace: "nowrap",
  },

  plus: {
    color: colors.grayDim,
  },

  popup: {
    paddingInline: spacing.huge,
  },

  row: {
    backgroundColor: {
      ":nth-of-type(even)": colors.stripeEven,
      ":nth-of-type(odd)": colors.stripeOdd,
      // eslint-disable-next-line @stylexjs/valid-styles
      default: null,
    },
  },

  table: {
    borderCollapse: "collapse",
    borderColor: colors.sepSurface,
    borderRadius: radii.md,
    borderStyle: "solid",
    borderWidth: dims.sep,
    fontSize: text.md,
    marginBottom: spacing.lg,
    marginInline: "auto",
    overflow: "hidden",
    width: "100%",
  },

  td: {
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    textAlign: "left",
  },

  th: {
    borderBottomColor: colors.graySep,
    borderBottomStyle: "solid",
    borderBottomWidth: dims.sep,
    fontWeight: 600,
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
    textAlign: "left",
  },
});

/**
 * The popup body listing every configured keyboard shortcut in a table. The
 * consumer supplies `<DialogRoot>` / `<DialogTrigger>` (see the AGENTS guide).
 */
export function ShortcutsDialog({
  shortcuts,
  t,
}: {
  /** The user-overridden shortcuts, merged over the defaults for display. */
  shortcuts: Partial<Shortcuts>;
  t: T;
}) {
  const keys: Shortcuts = { ...defaultShortcuts, ...shortcuts };

  return (
    <DialogPortal>
      <DialogPopup size="medium" style={styles.popup}>
        <DialogTitle>{t.keyboardShortcuts}</DialogTitle>
        <table sx={styles.table}>
          <thead>
            <tr>
              <th sx={styles.th}>{t.shortcutColumnAction}</th>
              <th sx={[styles.th, styles.keys]}>{t.shortcutColumnKey}</th>
            </tr>
          </thead>
          <tbody>
            {shortcutList.map(({ key, mod }) => (
              <tr key={key} sx={styles.row}>
                <td sx={styles.td}>{t[`shortcut_${key}`]}</td>
                <td sx={[styles.td, styles.keys]}>
                  {formatShortcut(keys[key], mod).map((token, index) => (
                    <Fragment key={token}>
                      {index > 0 && <span sx={styles.plus}>{" + "}</span>}
                      <kbd sx={styles.kbd}>{token}</kbd>
                    </Fragment>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DialogClose render={<Button style={styles.closeButton} />}>
          {t.close}
        </DialogClose>
      </DialogPopup>
    </DialogPortal>
  );
}
