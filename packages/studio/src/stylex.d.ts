import type { StyleXStyles } from "@stylexjs/stylex";

declare module "react" {
  interface HTMLAttributes<T> extends React.DOMAttributes<T> {
    sx?: StyleXStyles;
  }
}
