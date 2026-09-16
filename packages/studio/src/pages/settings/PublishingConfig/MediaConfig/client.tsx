"use client";

import * as stylex from "@stylexjs/stylex";

import { typography } from "#_/design/styles.js";
import { spacing } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Checkbox } from "#_/ui/Checkbox.js";
import { FieldSet, Legend } from "#_/ui/Fieldset.js";

import { usePublishingConfigClient } from "../client.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({
  checkboxField: {
    alignItems: "center",
    cursor: "pointer",
    display: "flex",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});

export function MediaConfigClient({ t }: { t: T }) {
  const { draft, patch } = usePublishingConfigClient();

  return (
    <FieldSet>
      <Legend>{t.media}</Legend>
      <p sx={typography.description}>{t.mediaDescription}</p>

      <label sx={styles.checkboxField}>
        <Checkbox
          checked={draft.media?.audio?.multiple ?? false}
          onChange={(e) => {
            const multiple = e.target.checked;
            patch({
              media: multiple ? { audio: { multiple } } : undefined,
            });
          }}
        />
        <span>{t.audioMultiple}</span>
      </label>
    </FieldSet>
  );
}
