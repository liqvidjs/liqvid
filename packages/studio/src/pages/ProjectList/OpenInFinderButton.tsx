"use client";

import { FolderOpenIcon } from "@phosphor-icons/react";

import { useTranslations } from "../../utils/react.tsx";
import { openInFinderAction } from "../root-actions.ts";

import styles from "./share.module.css";

import type T from "./.translations/en.json";

type T = typeof T;

export function OpenInFinderButton({ projectPath }: { projectPath: string }) {
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
