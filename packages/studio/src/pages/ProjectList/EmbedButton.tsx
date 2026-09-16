"use client";

import type { ProjectMeta } from "@liqvid/schemas";
import { CodeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffectEvent } from "react";

import { useLiqvidConfig } from "#_/contexts/liqvid-config.js";
import { useSelectedRootParameters } from "#_/contexts/selected-root-parameters.js";
import { colors, spacing } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { Button } from "#_/ui/Button.js";
import { interpolatePathParametersWithSelected } from "#_/utils/parameters-client.mjs";
import { useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface EmbedButtonProps {
  basePath: string;
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

export function EmbedButton({ basePath, project }: EmbedButtonProps) {
  const t = useTranslations<T>();

  const { domain } = useLiqvidConfig();

  const selectedRootParams = useSelectedRootParameters();

  // Interpolate path parameters using selected root params + project params
  const interpolatedPath = interpolatePathParametersWithSelected(
    project.path,
    undefined,
    selectedRootParams,
  );

  const handleClick = useEffectEvent(async () => {
    const previewPath = basePath
      ? `${basePath}/${interpolatedPath}`
      : `/${interpolatedPath}`;
    const src = domain + previewPath;
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
