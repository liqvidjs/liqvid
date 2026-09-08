import * as stylex from "@stylexjs/stylex";

import { H, Section } from "#_/components/headings.js";
import { fonts } from "#_/design/styles.js";
import { breakpoints, colors, spacing, text } from "#_/design/tokens.stylex.js";
import {
  getTranslations,
  interpolated,
  type Localized,
  PlainString,
} from "#_/utils/i18n.mjs";

import { PublishingConfig } from "./PublishingConfig/server.tsx";
import { UiConfig } from "./UiConfig/server.tsx";

import TranslationsJson from "./.translations/en.json" with { type: "json" };

type T = Localized<typeof TranslationsJson>;

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
  const t = interpolated(await getTranslations<T>(import.meta.url));

  return (
    <main {...stylex.props(styles.main)}>
      <Section
        component={
          <header>
            <H>{t.title}</H>
            <p {...stylex.props(fonts.description)}>
              {t.description({
                filename: (
                  <span {...stylex.props(fonts.filename)}>
                    {PlainString("liqvid.json")}
                  </span>
                ),
              })}
            </p>
          </header>
        }
      >
        <UiConfig />

        <PublishingConfig />
      </Section>
    </main>
  );
}
