"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { FolderOpenIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { openInFinderAction } from "#_/pages/root-actions.js";
import { Button } from "#_/ui/Button.js";
import { useTranslations } from "#_/utils/react.js";

import { shareStyles } from "./share.sx.ts";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export function OpenInFinderButton() {
  const projectPath = useProjectPath();
  const t = useTranslations<T>();
  async function handleClick() {
    await openInFinderAction(projectPath);
  }

  return (
    <Button
      {...stylex.props(shareStyles.productionLink)}
      onClick={handleClick}
      title={t.openInFinder}
    >
      <FolderOpenIcon size={24} />
    </Button>
  );
}
