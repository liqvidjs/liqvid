"use client";

import { FolderOpenIcon } from "@phosphor-icons/react";

import { openInFinderAction } from "../root-actions.ts";

import styles from "../root.module.css";

export function OpenInFinderButton({ projectPath }: { projectPath: string }) {
  async function handleClick() {
    await openInFinderAction(projectPath);
  }

  return (
    <button
      className={styles.productionLink}
      onClick={handleClick}
      title="Open in Finder"
      type="button"
    >
      <FolderOpenIcon size={24} />
    </button>
  );
}
