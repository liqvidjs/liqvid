import type { AspectRatio, AspectRatioSpecifier } from "@liqvid/schemas";

export function normalizeAspectRatio(a: AspectRatioSpecifier): AspectRatio {
  if (a === "video") return { height: 9, width: 16 };
  if (a === "square") return { height: 1, width: 1 };
  if (Array.isArray(a)) return { height: a[1], width: a[0] };
  if (typeof a === "number") return { height: 1, width: a };
  return a;
}
