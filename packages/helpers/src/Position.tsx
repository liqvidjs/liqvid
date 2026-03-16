import * as Slot from "@radix-ui/react-slot";
import type { Property } from "csstype";

export interface PositionProps {
  /** bottom */
  b?: Property.Bottom | undefined;

  children?: React.ReactNode;

  /** font-size */
  fs?: Property.FontSize | undefined;

  /** height */
  h?: Property.Height | undefined;

  /** right */
  r?: Property.Right | undefined;

  style?: React.CSSProperties;

  /** width */
  w?: Property.Width | undefined;

  /** left */
  x?: Property.Left | undefined;

  /** top */
  y?: Property.Top | undefined;

  /** z-index */
  z?: Property.ZIndex | undefined;
}

/** Positioning helper */
export function Position({
  b,
  fs,
  h,
  r,
  style,
  w,
  x,
  y,
  z,
  ...props
}: PositionProps) {
  const ourStyles = {} as React.CSSProperties;

  // be very careful about this to avoid hydration errors
  if (b !== undefined) ourStyles.bottom = b;
  if (fs !== undefined) ourStyles.fontSize = fs;
  if (h !== undefined) ourStyles.height = h;
  if (x !== undefined) ourStyles.left = x;
  if (r !== undefined) ourStyles.right = r;
  if (y !== undefined) ourStyles.top = y;
  if (w !== undefined) ourStyles.width = w;
  if (z !== undefined) ourStyles.zIndex = z;

  if (
    b !== undefined ||
    r !== undefined ||
    x !== undefined ||
    y !== undefined
  ) {
    ourStyles.position = "absolute";
  }

  return (
    <Slot.Root
      style={{
        ...ourStyles,
        ...style,
      }}
      {...props}
    />
  );
}
