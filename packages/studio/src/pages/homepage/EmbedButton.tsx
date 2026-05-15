"use client";

import type { ProjectMeta } from "@liqvid/schemas/project";
import { CodeIcon } from "@phosphor-icons/react";
import { useEffectEvent } from "react";

import styles from "../root.module.css";

interface EmbedButtonProps {
  basePath: string;
  productionServerPort: number;
  project: Pick<ProjectMeta, "aspectRatio" | "path">;
}

export function EmbedButton({
  basePath,
  productionServerPort,
  project,
}: EmbedButtonProps) {
  const handleClick = useEffectEvent(async () => {
    const previewPath = basePath
      ? `${basePath}/${project.path}`
      : `/${project.path}`;
    const src = `http://localhost:${productionServerPort}${previewPath}`;
    const embedCode = `<iframe src="${src}" style="aspect-ratio: ${project.aspectRatio.width} / ${project.aspectRatio.height}; width: 100%;"></iframe>`;

    await navigator.clipboard.writeText(embedCode);
  });

  return (
    <button
      className={styles.productionLink}
      onClick={handleClick}
      title="Copy embed code"
      type="button"
    >
      <CodeIcon size={24} />
    </button>
  );
}
