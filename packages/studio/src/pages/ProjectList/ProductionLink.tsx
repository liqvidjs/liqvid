"use client";

import { EyeIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";

import { spacing } from "#_/design/tokens.stylex";
import type { Localized } from "#_/i18n/shared";
import { MenuLinkItem } from "#_/ui/Menu";
import { useTranslations } from "#_/utils/react";

import type TranslationsJson from "./.translations/en.json";

type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({
  productionMenuLink: {
    marginLeft: spacing.zero,
    textAlign: "left",
    width: "auto",
  },
});

export function PreviewButton({ href }: { href: string }) {
  const t = useTranslations<T>();

  return (
    <MenuLinkItem
      href={href}
      rel="noopener noreferrer"
      sx={styles.productionMenuLink}
      target="_blank"
    >
      <EyeIcon size={24} />
      {t.preview}
    </MenuLinkItem>
  );
}
