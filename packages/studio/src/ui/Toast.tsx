import type { PluginContext } from "@liqvid/studio-plugin-api";
import classNames from "classnames";
import { CheckCircle, Info, XCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import styles from "./Toast.module.css";

export type ToastProps = Parameters<PluginContext["makeToast"]>[0] & {
  className?: string;
  ref?: React.Ref<HTMLElement>;
};

export type ToastPropsWithTime = ToastProps & {
  time: number;
};

const icons = {
  info: <XCircle color="red" fill="red" stroke="white" />,
  negative: <Info color="slateblue" fill="slateblue" stroke="white" />,
  success: <CheckCircle color="green" fill="green" stroke="white" />,
};

export function Toast({
  className,
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

  // useImperativeHandle(ref, () => ({
  //   hide(opts = {}) {
  //     return new Promise<void>((resolve) => {
  //       if (!elt.current) return;
  //
  //       const anim = elt.current.animate(hideToast.keyframes, {
  //         ...hideToast.options,
  //         ...opts,
  //       });
  //       anim.addEventListener("finish", () => resolve());
  //     });
  //   },
  // }));

  const icon = icons[toastType];

  return (
    <aside
      className={classNames(styles.Toast, className)}
      onClick={(e) => e.stopPropagation()}
      ref={elt}
    >
      <div className={styles.icon}>{icon}</div>
      <header>{title}</header>
      {message && <div className={styles.message}>{message}</div>}
    </aside>
  );
}

interface AnimationConfig {
  keyframes: Keyframe[] | PropertyIndexedKeyframes;
  options: KeyframeAnimationOptions;
}

/**
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
export const appearToast: AnimationConfig = {
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
