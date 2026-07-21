"use client";

import type { ProjectMeta } from "@liqvid/schemas";
import { CodeIcon } from "@phosphor-icons/react";
import { useEffectEvent } from "react";

import { useTranslations } from "../../utils/react.tsx";

import styles from "./share.module.css";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

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
  const t = useTranslations<T>();
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
      title={t.copyEmbedCode}
      type="button"
    >
      <CodeIcon size={24} />
    </button>
  );
}
