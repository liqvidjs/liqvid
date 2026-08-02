import clsx from "clsx";

import styles from "./Button.module.css";

export function Button({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    // biome-ignore lint/correctness/noRestrictedElements: this is where it's defined
    <button
      className={clsx(styles.button, className)}
      type="button"
      {...props}
    />
  );
}
