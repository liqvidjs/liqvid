import * as stylex from "@stylexjs/stylex";

import { H, Section } from "#_/components/headings.js";
import { Description } from "#_/design/styles.js";
import { spacing, text } from "#_/design/tokens.stylex.js";
import type { LocalizedReactNode } from "#_/i18n/shared.mjs";

const styles = stylex.create({
  heading: {
    alignItems: "center",
    display: "flex",
    fontSize: text.lg,
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.huge,
  },
});

export function ConfigSection({
  children,
  description,
  heading,
}: {
  children?: LocalizedReactNode;
  description: LocalizedReactNode;
  heading: LocalizedReactNode;
}) {
  return (
    <section sx={styles.section}>
      <Section
        component={
          <header>
            <H {...stylex.props(styles.heading)}>{heading}</H>
            <Description>{description}</Description>
          </header>
        }
      >
        {children}
      </Section>
    </section>
  );
}
