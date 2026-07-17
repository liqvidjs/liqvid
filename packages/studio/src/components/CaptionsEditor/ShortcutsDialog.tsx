"use client";

import { Fragment } from "react";

import { Button } from "../../ui/Button.tsx";
import {
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "../../ui/Dialog.tsx";

import {
  defaultShortcuts,
  formatShortcut,
  type Shortcuts,
  shortcutList,
} from "./shortcuts.ts";

import styles from "./ShortcutsDialog.module.css";

import type Translations from "./.translations/en.json";

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
  t: typeof Translations;
}) {
  const keys: Shortcuts = { ...defaultShortcuts, ...shortcuts };

  return (
    <DialogPortal>
      <DialogPopup className={styles.popup} size="medium">
        <DialogTitle>{t.keyboardShortcuts}</DialogTitle>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.shortcutColumnAction}</th>
              <th>{t.shortcutColumnKey}</th>
            </tr>
          </thead>
          <tbody>
            {shortcutList.map(({ key, mod }) => (
              <tr key={key}>
                <td>{t[`shortcut_${key}`]}</td>
                <td className={styles.keys}>
                  {formatShortcut(keys[key], mod).map((token, index) => (
                    <Fragment key={token}>
                      {index > 0 && (
                        <span className={styles.plus}>{" + "}</span>
                      )}
                      <kbd className={styles.kbd}>{token}</kbd>
                    </Fragment>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <DialogClose render={<Button />} style={{ margin: "0 auto" }}>
          {t.close}
        </DialogClose>
      </DialogPopup>
    </DialogPortal>
  );
}
