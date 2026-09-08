import { useColorScheme } from "@liqvid/color-scheme/react";
import { HydrateElement } from "@liqvid/hydration";
import * as stylex from "@stylexjs/stylex";

import { Toast, type ToastProps } from "./Toast.tsx";

const styles = stylex.create({
  toaster: {
    bottom: "20px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    right: "36px",
    rowGap: "8px",
    zIndex: 50,
  },
});

export function Toaster({
  toasts,
}: {
  toasts: (ToastProps & { time: number })[];
}) {
  const { colorScheme, persistence } = useColorScheme();

  const inner = (
    <div
      className={stylex.props(styles.toaster).className}
      style={{ colorScheme }}
    >
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
