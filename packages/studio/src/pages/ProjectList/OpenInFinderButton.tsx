"use client";

import { FolderOpenIcon } from "@phosphor-icons/react";
import type { RelativeDir } from "effect-paths";

import { useTranslations } from "../../utils/react.tsx";
import { openInFinderAction } from "../root-actions.ts";

import styles from "./share.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export function OpenInFinderButton({
  projectPath,
}: {
  projectPath: RelativeDir;
}) {
  const t = useTranslations<T>();
  async function handleClick() {
    await openInFinderAction(projectPath);
  }

  return (
    <button
      className={styles.productionLink}
      onClick={handleClick}
      title={t.openInFinder}
      type="button"
    >
      <FolderOpenIcon size={24} />
    </button>
  );
}
