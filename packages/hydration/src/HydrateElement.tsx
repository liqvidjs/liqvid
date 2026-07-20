import { IS_CLIENT } from "@liqvid/ssr";
import { Root as Slot } from "@radix-ui/react-slot";
import { useId } from "react";

import { HydrateOnClient } from "./HydrateOnClient.tsx";
import type { ArgType, LocalValueConfig } from "./types.ts";

export function HydrateElement<
  const Config extends readonly LocalValueConfig[],
>({
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

  if (IS_CLIENT) return children;

  return (
    <HydrateOnClient
      hydrationFn={`(...a)=>{let n=d.querySelector('[data-lvh=${JSON.stringify(id)}]');(${hydrationFn})(n,...a);n.removeAttribute("data-lvh")}`}
      {...props}
    >
      <Slot data-lvh={id}>{children}</Slot>
    </HydrateOnClient>
  );
}
