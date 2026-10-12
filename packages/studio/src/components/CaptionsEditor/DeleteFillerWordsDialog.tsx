"use client";

import * as stylex from "@stylexjs/stylex";

import { colors, spacing, text } from "#_/design/tokens.stylex";
import { type Localized, PlainString } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import { Checkbox } from "#_/ui/Checkbox";
import {
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "#_/ui/Dialog";
import { TextField } from "#_/ui/TextField";
import { useCommonTranslations } from "#_/utils/react";

import type { FillerWordOptions } from "./utils.ts";

import type Translations from "./.translations/en.json";

type T = Localized<typeof Translations>;

const styles = stylex.create({
  checkboxField: {
    alignItems: "center",
    display: "flex",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  confirmButton: {
    marginLeft: spacing.sm,
  },

  description: {
    color: colors.grayDim,
    fontSize: text.sm,
    marginBottom: spacing.zero,
    marginTop: spacing.md,
  },

  dialogActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: spacing.lg,
  },

  matchCount: {
    color: colors.grayDim,
    fontSize: text.sm,
    marginBottom: spacing.zero,
    marginTop: spacing.lg,
  },

  popup: {
    left: "50%",
    maxWidth: "min(24rem, calc(100% - 2rem))",
    top: "1rem",
    transform: "translate(-50%, 0)",
    width: "min(24rem, calc(100% - 2rem))",
  },
});

/**
 * Popup for the "delete filler words" action: a comma-separated list of filler
 * words with case/punctuation matching options, the current match count, and a
 * confirm button.
 *
 * The consumer supplies `<DialogRoot>` and the open state. Keeping the dialog
 * non-modal lets the user watch matches highlight in the transcript while
 * adjusting the options.
 */
export function DeleteFillerWordsDialog({
  matchCount,
  onConfirm,
  options,
  setOptions,
  t,
}: {
  /** How many transcript words currently match. */
  matchCount: number;

  /** Deletes all matching words and closes the dialog. */
  onConfirm: () => void;

  options: FillerWordOptions;
  setOptions: (options: FillerWordOptions) => void;
  t: T;
}) {
  const c = useCommonTranslations();

  return (
    <DialogPortal>
      <DialogPopup style={styles.popup}>
        <DialogTitle>{t.deleteFillerWords}</DialogTitle>

        <p sx={styles.description}>{t.fillerWordsDescription}</p>

        <TextField
          label={t.fillerWords}
          onChange={(fillerWords) => setOptions({ ...options, fillerWords })}
          placeholder={PlainString("uh, um, yeah")}
          value={options.fillerWords}
        />

        <label sx={styles.checkboxField}>
          <Checkbox
            checked={options.ignoreCapitalization}
            onChange={(e) =>
              setOptions({
                ...options,
                ignoreCapitalization: e.target.checked,
              })
            }
          />
          <span>{t.ignoreCapitalization}</span>
        </label>

        <label sx={styles.checkboxField}>
          <Checkbox
            checked={options.ignorePunctuation}
            onChange={(e) =>
              setOptions({ ...options, ignorePunctuation: e.target.checked })
            }
          />
          <span>{t.ignorePunctuation}</span>
        </label>

        <p sx={styles.matchCount}>
          {matchCount} {t.matchingWords}
        </p>

        <div sx={styles.dialogActions}>
          <DialogClose render={<Button />}>{c.cancel}</DialogClose>
          <Button
            disabled={matchCount === 0}
            kind="destructive"
            onClick={onConfirm}
            style={styles.confirmButton}
          >
            {t.deleteMatchingWords}
          </Button>
        </div>
      </DialogPopup>
    </DialogPortal>
  );
}
