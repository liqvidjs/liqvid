"use client";

import * as stylex from "@stylexjs/stylex";
import { Fragment } from "react";

import { Button } from "#_/ui/Button.js";
import {
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "#_/ui/Dialog.js";
import type { Localized } from "#_/utils/i18n.mjs";

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
    marginBlock: "0",
    marginInline: "auto",
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
        <table {...stylex.props(styles.table)}>
          <thead>
            <tr>
              <th {...stylex.props(styles.th)}>{t.shortcutColumnAction}</th>
              <th {...stylex.props(styles.th)}>{t.shortcutColumnKey}</th>
            </tr>
          </thead>
          <tbody>
            {shortcutList.map(({ key, mod }, i) => (
              <tr key={key} {...stylex.props(i % 2 === 1 && styles.evenRow)}>
                <td {...stylex.props(styles.td)}>{t[`shortcut_${key}`]}</td>
                <td {...stylex.props(styles.td, styles.keys)}>
                  {formatShortcut(keys[key], mod).map((token, index) => (
                    <Fragment key={token}>
                      {index > 0 && (
                        <span {...stylex.props(styles.plus)}>{" + "}</span>
                      )}
                      <kbd {...stylex.props(styles.kbd)}>{token}</kbd>
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
