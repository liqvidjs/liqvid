"use client";

import type { ShortcutsSpecifier } from "@liqvid/keymap";
import { HighlighterIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { colors, dims } from "#_/design/tokens.stylex.js";
import type { LocalizedString } from "#_/i18n/shared.js";
import { DockableDialog } from "#_/ui/DockableDialog";

import { HighlightsDialog } from "./HighlightsDialog.tsx";

export interface HighlightsControlProps {
  /** Shortcut to toggle the Highlights panel */
  shortcut?: ShortcutsSpecifier;
}

const styles = stylex.create({
  trigger: {
    alignItems: "center",
    color: {
      ":active": colors.grayActive,
      ":hover": colors.grayHover,
      default: colors.grayApp,
    },
    cursor: "pointer",
    display: "inline-flex",
    height: dims.recordingIcon,
    justifyContent: "center",
    width: dims.recordingIcon,
  },
});

const t = {
  triggerTitle: "Manage highlights" as LocalizedString,
};

/**
 * Liqvid highlights control.
 */
export function HighlightsControl({ shortcut }: HighlightsControlProps) {
  return (
    <DockableDialog.Root name="highlights" shortcut={shortcut}>
      <DockableDialog.Trigger asChild>
        {/** biome-ignore lint/correctness/noRestrictedElements: special */}
        <button sx={styles.trigger} title={t.triggerTitle} type="button">
          <HighlighterIcon size={22} weight="fill" />
        </button>
      </DockableDialog.Trigger>

      <HighlightsDialog />
    </DockableDialog.Root>
  );
}
