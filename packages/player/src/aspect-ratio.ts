export interface AspectRatio {
  h: number;
  w: number;
}

export type AspectRatioSpecifier =
  | AspectRatio
  | [number, number]
  | number
  | "video"
  | "square";

export function normalizeAspectRatio(a: AspectRatioSpecifier): AspectRatio {
  if (a === "video") return { h: 9, w: 16 };
  if (a === "square") return { h: 1, w: 1 };
  if (Array.isArray(a)) return { h: a[1], w: a[0] };
  if (typeof a === "number") return { h: 1, w: a };
  return a;
}
