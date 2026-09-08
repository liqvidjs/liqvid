import * as stylex from "@stylexjs/stylex";

/**
 * Shortcut to apply styles to a base component.
 */
export const themed =
  <C extends keyof React.JSX.IntrinsicElements | React.FC<any>>(
    Component: C,
    preset: stylex.StyleXStyles,
  ) =>
  (props: React.ComponentProps<C>) => {
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
  ({ style, ...props }: Props & { style?: Style }) => (
    <Component
      {...(props as Props)}
      {...stylex.props(style ? [preset, style] : style)}
    />
  );
