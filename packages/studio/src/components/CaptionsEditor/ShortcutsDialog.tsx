"use client";

import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";

import { spacing } from "#_/design/tokens.stylex.js";
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
import { styles } from "./shortcutsDialog.sx.ts";

import type Translations from "./.translations/en.json";

type T = Localized<typeof Translations>;

const sxStyles = stylex.create({
  closeButton: {
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
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
      <DialogPopup size="medium">
        <DialogTitle>{t.keyboardShortcuts}</DialogTitle>
        <table sx={styles.table}>
          <thead>
            <tr>
              <th sx={styles.th}>{t.shortcutColumnAction}</th>
              <th sx={styles.th}>{t.shortcutColumnKey}</th>
            </tr>
          </thead>
          <tbody>
            {shortcutList.map(({ key, mod }, i) => (
              <tr key={key} sx={i % 2 === 1 && styles.evenRow}>
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
        <DialogClose render={<Button />} style={sxStyles.closeButton}>
          {t.close}
        </DialogClose>
      </DialogPopup>
    </DialogPortal>
  );
}
