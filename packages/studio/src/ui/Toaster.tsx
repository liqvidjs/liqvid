import { useColorScheme } from "@liqvid/color-scheme/react";
import { HydrateElement } from "@liqvid/hydration";

import { Toast, type ToastProps } from "./Toast.tsx";

import styles from "./Toaster.module.css";

export function Toaster({
  toasts,
}: {
  toasts: (ToastProps & { time: number })[];
}) {
  const { colorScheme, persistence } = useColorScheme();

  const inner = (
    <div className={styles.Toaster} style={{ colorScheme }}>
      {toasts.map((t) => (
        <Toast key={t.time} {...t} />
      ))}
    </div>
  );

  return persistence ? (
    <HydrateElement
      from={[persistence]}
      hydrationFn={(node, colorScheme) => {
        // node.style.
        node.setAttribute("style", `color-scheme:${colorScheme}`);
      }}
    >
      {inner}
    </HydrateElement>
  ) : (
    inner
  );
}
