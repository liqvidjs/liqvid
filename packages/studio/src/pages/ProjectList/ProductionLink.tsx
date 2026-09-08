"use client";

import { EyeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import type { Localized } from "#_/utils/i18n.mjs";
import { useTranslations } from "#_/utils/react.js";

import { shareStyles } from "./share.sx.ts";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

export function PreviewButton({ href }: { href: string }) {
  const t = useTranslations<T>();

  return (
    <a
      {...stylex.props(shareStyles.productionLink)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
      title={t.preview}
    >
      <EyeIcon size={24} />
    </a>
  );
}
