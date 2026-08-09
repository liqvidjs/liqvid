import { IS_CLIENT } from "@liqvid/ssr";
import { Children, cloneElement } from "react";

export function Slot({
  children,
  ...props
}: {
  children: React.ReactElement;
  [key: string]: unknown;
}) {
  if (IS_CLIENT) return children;

  const singleChild = Children.only(children);
  return cloneElement(singleChild, props);
}
