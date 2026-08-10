import clsx from "clsx";
import { useKeymap } from "liqvid";
import { createElement, useEffect, useState } from "react";

/**
 * Use if you want to test two options
 */
export function useABTesting() {
  const [state, setState] = useState<"A" | "B">("A");
  const keymap = useKeymap();

  useEffect(() => {
    const handleA = () => {
      setState("A");
    };

    const handleB = () => {
      setState("B");
    };

    keymap.bind("A", handleA);
    keymap.bind("B", handleB);

    return () => {
      keymap.unbind("A", handleA);
      keymap.unbind("B", handleB);
    };
  }, [keymap]);

  return { A: state === "A", B: state === "B", state };
}

/** Create a component with a reusable className from a template. */
export function brand<
  Base extends
    | keyof React.JSX.IntrinsicElements
    // biome-ignore lint/suspicious/noExplicitAny: variance
    | React.JSXElementConstructor<any>,
>(
  displayName: string,
  baseName: Base,
  {
    className: templateClassName,
    style: templateStyle,
    ...templateProps
  }: Partial<React.ComponentProps<Base>>,
  {
    merge = clsx,
  }: {
    /** Function to use for merging class names */
    merge?: (...args: (string | null | undefined | false)[]) => string;
  } = {},
) {
  type Props = React.ComponentProps<Base>;

  const component = ({ className, style, ...props }: Props) =>
    createElement(baseName, {
      className: merge(templateClassName, className),
      style: { ...templateStyle, ...style },
      ...templateProps,
      ...props,
    });
  component.displayName = displayName;

  return component;
}
