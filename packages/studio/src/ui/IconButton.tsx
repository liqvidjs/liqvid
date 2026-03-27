"use client";

import styles from "./IconButton.module.css";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The icon to display */
  children?: React.ReactNode;

  /** Ref to the button element */
  ref?: React.Ref<HTMLButtonElement>;

  /** Size of the button. Defaults to "md" */
  size?: "sm" | "md" | "lg";

  /** Visual variant. Defaults to "default" */
  variant?: "default" | "primary";
}

export function IconButton({
  children,
  className,
  ref,
  size = "md",
  variant = "default",
  ...props
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      className={`${styles.iconButton} ${styles[size]} ${styles[variant]} ${className ?? ""}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
