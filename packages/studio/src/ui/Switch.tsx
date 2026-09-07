import { Switch as BaseSwitch } from "@base-ui/react";
import type { SwitchRootState } from "@base-ui/react/switch";
import * as stylex from "@stylexjs/stylex";

import { colors } from "#_/design/tokens.stylex.js";

const styles = stylex.create({
  root: {
    backgroundColor: "var(--gray-solid)",
    borderRadius: "9999px",
    borderStyle: "none",
    cursor: "pointer",
    height: "1.25rem",
    padding: "2px",
    position: "relative",
    transitionDuration: "0.2s",
    transitionProperty: "background-color",
    width: "2.25rem",
  },
  rootChecked: {
    backgroundColor: colors.accentSolid,
  },
  thumb: {
    backgroundColor: "#fff",
    borderRadius: "9999px",
    display: "block",
    height: "1rem",
    transform: "translateX(0)",
    transitionDuration: "0.2s",
    transitionProperty: "transform",
    width: "1rem",
  },
  thumbChecked: {
    transform: "translateX(1rem)",
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
