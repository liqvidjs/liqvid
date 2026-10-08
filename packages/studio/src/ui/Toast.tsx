import type { PluginContext } from "@liqvid/studio-plugin-api";
import { combineRefs } from "@liqvid/utils";
import { CheckCircleIcon, InfoIcon, XCircleIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { useEffect, useRef } from "react";

import {
  colors,
  rounded,
  shadows,
  spacing,
  text,
  typeface,
} from "#_/design/tokens.stylex";

const ICON_SIZE = "24px";

const styles = stylex.create({
  header: {
    color: colors.grayNormal,
    fontFamily: typeface.ui,
    fontSize: text.md,
    fontWeight: 500,
    gridColumn: "header",
    gridRow: "header",
    lineHeight: ICON_SIZE,
    textAlign: "left",
  },

  icon: {
    alignItems: "center",
    display: "inline-flex",
    gridColumn: "icon",
    gridRow: "icon",
    height: ICON_SIZE,
    justifyContent: "center",
    lineHeight: ICON_SIZE,
    width: ICON_SIZE,
  },

  message: {
    color: colors.grayDim,
    gridColumn: "message",
    gridRow: "message",
  },

  toast: {
    backgroundColor: colors.surface,
    borderRadius: rounded.lg,
    boxShadow: shadows.radial,
    display: "grid",
    gap: spacing.sm,
    grid: `"icon header" "icon message" / ${ICON_SIZE} 1fr`,
    paddingBlock: spacing.md,
    paddingInline: spacing.md,
  },
});

export type ToastProps = Parameters<PluginContext["makeToast"]>[0] & {
  ref?: React.Ref<HTMLElement>;
};

export type ToastPropsWithTime = ToastProps & {
  time: number;
};

const icons = {
  info: <XCircleIcon color="red" fill="red" stroke="white" />,
  negative: <InfoIcon color="slateblue" fill="slateblue" stroke="white" />,
  success: <CheckCircleIcon color="green" fill="green" stroke="white" />,
};

export function Toast({
  message,
  ref,
  title,
  type: toastType = "info",
}: ToastProps) {
  // hide animation
  const elt = useRef<HTMLElement>(null);

  // Add appear animation on mount
  useEffect(() => {
    if (!elt.current) return;
    elt.current.animate(appearToast.keyframes, appearToast.options);
  }, []);

  const icon = icons[toastType];

  return (
    <aside ref={combineRefs(ref, elt)} sx={styles.toast}>
      <span sx={styles.icon}>{icon}</span>
      <header sx={styles.header}>{title}</header>
      {message && <div sx={styles.message}>{message}</div>}
    </aside>
  );
}

interface AnimationConfig {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options: KeyframeAnimationOptions;
}

/**
 * @future
 * Animation for hiding a toast notification.
 * @see {@link https://www.figma.com/file/zdML9fFY9V0Oah28S0Msd3?node-id=3384:30299#314140994 Figma discussion}
 */
export const hideToast: AnimationConfig = {
  keyframes: [
    { opacity: "1", transform: "translateY(0%)" },
    { opacity: "0", transform: "translateY(calc(100% + 1em))" },
  ],
  options: {
    duration: 200,
    easing: "ease-out",
    fill: "forwards",
  },
};

/**
 * Animation for showing a toast notification.
 */
const appearToast: AnimationConfig = {
  keyframes: [
    { opacity: "0", transform: "translateY(calc(100% + 1em))" },
    { opacity: "1", transform: "translateY(0%)" },
  ],
  options: {
    duration: 200,
    easing: "ease-out",
    fill: "forwards",
  },
};
