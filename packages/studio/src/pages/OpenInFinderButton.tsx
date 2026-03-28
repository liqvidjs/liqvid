"use client";

import { FolderOpen } from "lucide-react";

import { openInFinderAction } from "./root-actions";

import styles from "./root.module.css";

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
      <FolderOpen size={24} />
    </button>
  );
}
