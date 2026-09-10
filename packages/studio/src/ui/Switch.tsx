import { Switch as BaseSwitch } from "@base-ui/react";
import type { SwitchRootState } from "@base-ui/react/switch";
import * as stylex from "@stylexjs/stylex";

import { colors, radii, spacing } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  root: {
    "--pad": spacing.sm,
    "--thumb": "1rem",
    backgroundColor: "gray",
    borderRadius: radii.max,
    borderStyle: "none",
    cursor: "pointer",
    height: `calc(var(--thumb) + 2 * var(--pad))`,
    padding: `var(--pad)`,
    position: "relative",
    transitionDuration: "0.2s",
    transitionProperty: "background-color",
    width: `calc(2 * (var(--thumb) + var(--pad)))`,
  },
  rootChecked: {
    backgroundColor: colors.accentSolid,
  },
  thumb: {
    backgroundColor: colors.white,
    borderRadius: radii.max,
    display: "block",
    height: "var(--thumb)",
    transform: "translateX(0)",
    transitionDuration: "0.2s",
    transitionProperty: "transform",
    width: "var(--thumb)",
  },
  thumbChecked: {
    transform: "translateX(100%)",
  },
});

export function Switch(props: React.ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      nativeButton
      // biome-ignore lint/a11y/useButtonType: provided by Base UI
      // biome-ignore lint/correctness/noRestrictedElements: passed to Base UI
      render={<button />}
      {...props}
      className={(state: SwitchRootState) =>
        stylex.props(styles.root, state.checked && styles.rootChecked).className
      }
    >
      <BaseSwitch.Thumb
        className={(state: SwitchRootState) =>
          stylex.props(styles.thumb, state.checked && styles.thumbChecked)
            .className
        }
      />
    </BaseSwitch.Root>
  );
}
