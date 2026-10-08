"use client";

import type { ProjectMeta } from "@liqvid/schemas";
import { CodeIcon } from "@phosphor-icons/react";
import { useEffectEvent } from "react";

import { useLiqvidConfig } from "#_/contexts/liqvid-config";
import { useSelectedRootParameters } from "#_/contexts/selected-root-parameters";
import type { Localized } from "#_/i18n/shared";
import { Button } from "#_/ui/Button";
import { MenuItem } from "#_/ui/Menu";
import { interpolatePathParametersWithSelected } from "#_/utils/parameters-client";
import { useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

interface EmbedButtonProps {
  basePath: string;
  project: Pick<ProjectMeta, "aspectRatio" | "path">;
}

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

  const handleClick = async () => {
    const previewPath = basePath
      ? `${basePath}/${interpolatedPath}`
      : `/${interpolatedPath}`;
    const src = domain + previewPath;
    const embedCode = `<iframe src="${src}" style="aspect-ratio: ${project.aspectRatio.width} / ${project.aspectRatio.height}; width: 100%;"></iframe>`;

    await navigator.clipboard.writeText(embedCode);
  };

  return (
    <MenuItem onClick={handleClick}>
      <CodeIcon size={24} />
      {t.copyEmbedCode}
    </MenuItem>
  );
}
