import { CONFIG_FILE } from "@liqvid/cli/utils";
import * as stylex from "@stylexjs/stylex";

import { H, Section } from "#_/components/headings.js";
import { fonts } from "#_/design/styles.js";
import { breakpoints, spacing, text } from "#_/design/tokens.stylex.js";
import { interpolated, type Localized } from "#_/i18n/shared.mjs";
import { getTranslations } from "#_/utils/i18n.mjs";

import { PublishingConfig } from "./PublishingConfig/server.tsx";
import { UiConfig } from "./UiConfig/server.tsx";

import TranslationsJson from "./.translations/en.json" with { type: "json" };

type T = Localized<typeof TranslationsJson>;

const styles = stylex.create({
  main: {
    fontSize: text.base,
    marginBlock: spacing.zero,
    marginInline: spacing.auto,
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
    <main sx={styles.main}>
      <Section
        component={
          <header>
            <H>{t.title}</H>
            <p sx={fonts.description}>
              {t.description({
                filename: <span sx={fonts.filename}>{CONFIG_FILE}</span>,
              })}
            </p>
          </header>
        }
      >
        <PublishingConfig />
        <UiConfig />
      </Section>
    </main>
  );
}
