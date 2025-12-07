import { isClient } from "@liqvid/ssr";
import { Root as Slot } from "@radix-ui/react-slot";
import { useId } from "react";

import { HydrateOnClient } from "./HydrateOnClient";
import type { ArgType, LocalValueConfig } from "./types";

export function HydrateElement<Config extends readonly LocalValueConfig[]>({
  children,
  hydrationFn,
  ...props
}: {
  children: React.ReactElement;

  /**
   * You should always pass this with `as const`.
   */
  from: Config;

  /**
   * **🚨WARNING🚨**
   * This does not behave like a regular JavaScript function.
   * Instead, its literal string representation will be passed down to the client.
   * In particular, **you cannot use any external variables or functions** within
   * this function.
   *
   * To avoid confusion, you can instead pass a string; however, a function
   * is easier to work with in your editor.
   */
  hydrationFn: (
    node: HTMLElement,
    ...args: {
      [key in keyof Config]: ArgType<Config[key]>;
    }
  ) => unknown;
}) {
  const id = useId();

  if (isClient) return children;

  return (
    <HydrateOnClient
      hydrationFn={`(...a)=>{let n=d.getElementById(${JSON.stringify(id)});(${hydrationFn})(n,...a);n.removeAttribute("id")}`}
      {...props}
    >
      <Slot id={id}>{children}</Slot>
    </HydrateOnClient>
  );
}
