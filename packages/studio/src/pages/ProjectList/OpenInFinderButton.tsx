"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { FolderOpenIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { spacing } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { openInFinderAction } from "#_/pages/root-actions.js";
import { Button } from "#_/ui/Button.js";
import { useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({
  productionLink: {
    marginLeft: spacing.auto,
  },
});

export function OpenInFinderButton() {
  const projectPath = useProjectPath();
  const t = useTranslations<T>();
  async function handleClick() {
    await openInFinderAction(projectPath);
  }

  return (
    <Button
      onClick={handleClick}
      style={styles.productionLink}
      title={t.openInFinder}
    >
      <FolderOpenIcon size={24} />
    </Button>
  );
}
