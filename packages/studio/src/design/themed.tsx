import * as stylex from "@stylexjs/stylex";

import type { LocalizedReactNode, LocalizedString } from "#_/utils/i18n.mjs";

/**
 * Shortcut to apply styles to a base component.
 */
export const themed =
  // biome-ignore lint/suspicious/noExplicitAny: variance
    <C extends keyof React.JSX.IntrinsicElements | React.FC<any>>(
      Component: C,
      preset: stylex.StyleXStyles,
    ) =>
    (
      props: Omit<React.ComponentProps<C>, "children"> & {
        children?: LocalizedReactNode;
      },
    ) => {
      // biome-ignore lint/suspicious/noExplicitAny: cast needed for generic JSX spread
      const Comp = Component as any;
      return <Comp {...props} {...stylex.props(preset)} />;
    };

/**
 * Shortcut to apply styles to a base component, allowing
 * additional styles to be passed.
 */
export const extensible =
  <Style extends stylex.StyleXStyles = stylex.StyleXStyles>() =>
  <Props,>(Component: React.FC<Props>, preset: stylex.StyleXStyles) =>
  ({
    style,
    ...props
  }: Omit<Props, "children" | "style"> & {
    "aria-label"?: LocalizedString;
    children?: LocalizedReactNode;
    style?: Style;
  }) => (
    <Component
      {...(props as Props)}
      {...stylex.props(style ? [preset, style] : style)}
    />
  );
