"use client";

import { EyeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { colors, spacing } from "#_/design/tokens.stylex.js";
import type { Localized } from "#_/i18n/shared.mjs";
import { useTranslations } from "#_/utils/react.js";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

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

export function PreviewButton({ href }: { href: string }) {
  const t = useTranslations<T>();

  return (
    <a
      href={href}
      rel="noopener noreferrer"
      sx={styles.productionLink}
      target="_blank"
      title={t.preview}
    >
      <EyeIcon size={24} />
    </a>
  );
}
