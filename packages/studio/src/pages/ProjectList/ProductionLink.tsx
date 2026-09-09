"use client";

import { EyeIcon } from "@phosphor-icons/react";

import type { Localized } from "#_/i18n/shared.mjs";
import { useTranslations } from "#_/utils/react.js";

import { shareStyles } from "./share.sx.ts";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export function PreviewButton({ href }: { href: string }) {
  const t = useTranslations<T>();

  return (
    <a
      href={href}
      rel="noopener noreferrer"
      sx={shareStyles.productionLink}
      target="_blank"
      title={t.preview}
    >
      <EyeIcon size={24} />
    </a>
  );
}
