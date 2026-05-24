import { ResizeObserver } from "@juggle/resize-observer";
import { Canvas as ThreeCanvas } from "@react-three/fiber";

import { Fixes } from "./fixes.tsx";

export { defaultAffords } from "./affordances.ts";

/**
 * Liqvid-aware Canvas component @react-three/fiber
 */
export function Canvas({
  children,
  "data-affords": dataAffords,
  ...props
}: React.ComponentProps<typeof ThreeCanvas> & { "data-affords"?: string }) {
  return (
    <ThreeCanvas resize={{ polyfill: ResizeObserver }} {...props}>
      <Fixes dataAffords={dataAffords} />
      {children}
    </ThreeCanvas>
  );
}
