import type { AspectRatio, AspectRatioSpecifier } from "@liqvid/schemas";

export function normalizeAspectRatio(a: AspectRatioSpecifier): AspectRatio {
  if (a === "video") return { height: 9, width: 16 };
  if (a === "square") return { height: 1, width: 1 };
  if (isReadonlyArray(a)) {
    const [width, height] = a;
    return { height, width };
  }
  if (typeof a === "number") return { height: 1, width: a };
  if (typeof a === "string") {
    const [width, height] = a.split(":").map(Number) as [number, number];
    return { height, width };
  }
  return a;
}

function isReadonlyArray(
  value: AspectRatioSpecifier,
): value is readonly [number, number] {
  return Array.isArray(value);
}
