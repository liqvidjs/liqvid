"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { FolderOpenIcon } from "@phosphor-icons/react";

import type { Localized } from "#_/i18n/shared";
import { openInFinderAction } from "#_/pages/root-actions";
import { MenuItem } from "#_/ui/Menu";
import { useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export function OpenInFinderButton() {
  const projectPath = useProjectPath();
  const t = useTranslations<T>();
  async function handleClick() {
    await openInFinderAction(projectPath);
  }

  return (
    <MenuItem onClick={handleClick}>
      <FolderOpenIcon size={24} />
      {t.openInFinder}
    </MenuItem>
  );
}
