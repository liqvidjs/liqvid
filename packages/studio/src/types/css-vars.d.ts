import type * as CSS from "csstype";

declare module "react" {
  export interface CSSProperties extends CSS.Properties<string | number> {
    "--dialog-level"?: `${number}`;
  }
}
