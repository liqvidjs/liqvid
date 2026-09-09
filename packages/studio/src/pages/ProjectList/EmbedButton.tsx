"use client";

import type { ProjectMeta } from "@liqvid/schemas";
import { CodeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffectEvent } from "react";

import { colors, spacing } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import { useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface EmbedButtonProps {
  basePath: string;
  productionServerPort: number;
  project: Pick<ProjectMeta, "aspectRatio" | "path">;
}

const styles = stylex.create({
  productionLink: {
    color: {
      ":hover": colors.grayNormal,
      default: colors.grayDim,
    },
    marginLeft: spacing.auto,
    textAlign: "right",
    textDecoration: "none",
    width: "min-content",
  },
});

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
    <Button
      {...stylex.props(styles.productionLink)}
      onClick={handleClick}
      title={t.copyEmbedCode}
    >
      <CodeIcon size={24} />
    </Button>
  );
}
