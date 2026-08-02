"use client";

import { useProjectPath } from "@liqvid/studio-plugin-api";
import { FolderOpenIcon } from "@phosphor-icons/react";

import { Button } from "../../ui/Button.tsx";
import { useTranslations } from "../../utils/react.tsx";
import { openInFinderAction } from "../root-actions.ts";

import styles from "./share.module.css";

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
      className={styles.productionLink}
      onClick={handleClick}
      title={t.openInFinder}
    >
      <FolderOpenIcon size={24} />
    </Button>
  );
}
