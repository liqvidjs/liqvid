import * as stylex from "@stylexjs/stylex";

const styles = stylex.create({
  button: {
    alignItems: "center",
    backgroundColor: {
      ":active:enabled": "light-dark(#d0d0d0, #333)",
      ":disabled": "light-dark(#f0f0f0, #333)",
      ":hover:enabled": "light-dark(#fafafa, #444)",
      default: "light-dark(#f0f0f0, #333)",
    },
    borderColor: "light-dark(#ccc, #555)",
    borderRadius: "4px",
    borderStyle: "solid",
    borderWidth: "1px",

    color: {
      ":disabled": "light-dark(#aaa, #eee)",
      default: "light-dark(#333, #fff)",
    },
    cursor: {
      ":disabled": "default",
      default: "pointer",
    },
    display: "flex",
    fontSize: ".75rem",
    gap: ".25rem",
    padding: ".3em .5em",
    transition: "background-color 0.15s",
  },
});

export function Button({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is where it's defined
    <button type="button" {...props} {...stylex.props(styles.button)} />
  );
}
