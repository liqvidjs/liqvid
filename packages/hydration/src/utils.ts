import { golf } from "./golf";
import type { ComparisonVariant, StringVariant } from "./types";

// type Joinable = boolean | undefined | null | string | Joinable[];

export const iife = (...lines: (boolean | undefined | null | string)[]) => {
  return `(()=>{${lines
    .reduce<string[]>((acc, curr) => {
      if (!curr) return acc;

      if (typeof curr === "string") {
        acc.push(curr);
      } else if (Array.isArray(curr)) {
        acc.push(...curr);
      }

      return acc;
    }, [])
    .join(";\n")}})()`;
};

export function matches<T extends string | number>(
  value: T,
  o: ComparisonVariant<T>,
) {
  if (typeof o.eq !== "undefined" && !(value === o.eq)) {
    return false;
  }
  if (typeof o.lt !== "undefined" && !(value < o.lt)) {
    return false;
  }
  if (typeof o.lte !== "undefined" && !(value <= o.lte)) {
    return false;
  }
  if (typeof o.gt !== "undefined" && !(value > o.gt)) {
    return false;
  }
  if (typeof o.gte !== "undefined" && !(value >= o.gte)) {
    return false;
  }

  return true;
}

/**
 * Transform a thing
 */
export function comparisonCondition<T>(o: ComparisonVariant<T>) {
  const conditions = [];

  if (typeof o.eq !== "undefined") {
    conditions.push(`${golf.value}===${JSON.stringify(o.eq)}`);
  }
  if (typeof o.lt !== "undefined") {
    conditions.push(`${golf.value}<${JSON.stringify(o.lt)}`);
  }
  if (typeof o.lte !== "undefined") {
    conditions.push(`${golf.value}<=${JSON.stringify(o.lte)}`);
  }
  if (typeof o.gt !== "undefined") {
    conditions.push(`${golf.value}>${JSON.stringify(o.gt)}`);
  }
  if (typeof o.gte !== "undefined") {
    conditions.push(`${golf.value}>=${JSON.stringify(o.gte)}`);
  }

  return conditions.join("&&");
}

export function stringCondition(o: StringVariant) {
  return comparisonCondition(o);
}
