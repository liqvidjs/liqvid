import * as stylex from "@stylexjs/stylex";

import { H, Section } from "#_/components/headings.js";
import { breakpoints, colors, spacing, text } from "#_/design/tokens.stylex.js";
import { getTranslations } from "#_/utils/i18n.mjs";

import { PublishingConfig } from "./PublishingConfig/server.tsx";
import { UiConfig } from "./UiConfig/server.tsx";

import type TranslationsJson from "./.translations/en.json";

type T = typeof TranslationsJson;

export const styles = stylex.create({
  check: {
    color: colors.accentSolid,
  },

  description: {
    color: colors.grayDim,
    margin: `${spacing.xs} 0 ${spacing.lg}`,
  },

  main: {
    fontSize: text.base,
    marginBlock: "0",
    marginInline: "auto",
    padding: `${spacing.control} 0`,
    width: {
      default: null,
      [breakpoints.desktop]: "48rem",
    },
  },
});

export async function Settings() {
  const t = await getTranslations<T>(import.meta.url);

  return (
    <main {...stylex.props(styles.main)}>
      <Section component={<H>{t.title}</H>}>
        <UiConfig />

        <PublishingConfig />
      </Section>
    </main>
  );
}
