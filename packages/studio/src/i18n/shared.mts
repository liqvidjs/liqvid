import { Brand } from "effect";
import type { AnyPath } from "effect-paths";
import { createElement } from "react";
import { Fragment } from "react/jsx-runtime";

const INTERPOLATION_IDEMPOTENT = Symbol(
  "indicates that the object has already had client-side functionization applied",
);

/** A localized string. */
export type LocalizedString = string & Brand.Brand<"LocalizedString">;

/** A string that should not be localized. */
export type PlainString = string & Brand.Brand<"PlainString">;

export const PlainString = Brand.nominal<PlainString>();
export type Interpolated<T> = T extends LocalizedString
  ? T
  : {
      [key in keyof T]: T[key] extends InterpolationConfig<infer V>
        ? {
            (vars: Record<V, LocalizedString | number>): LocalizedString;
            (vars: Record<V, LocalizedReactNode>): LocalizedReactNode;
          }
        : Interpolated<T[key]>;
    };
export function interpolated<T>(t: T): Interpolated<T> {
  if (
    (t as unknown as { [key: symbol]: boolean | undefined })[
      INTERPOLATION_IDEMPOTENT
    ]
  ) {
    return t as Interpolated<T>;
  }

  const deep = {
    [INTERPOLATION_IDEMPOTENT]: true,
  } as unknown as Interpolated<T>;

  for (const key in t) {
    const value = t[key];

    if (typeof value === "string") {
      deep[key] = value as Interpolated<T>[typeof key];
    } else if (isInterpolationConfig(value)) {
      deep[key] = ((vars: Record<string, LocalizedReactNode>) => {
        const isPlain = Object.values(vars).every((v) => typeof v !== "object");

        const parts = value._.split(/\{([^}]+)\}/g);

        if (isPlain) {
          return parts
            .map((str, index) => (index % 2 === 0 ? str : String(vars[str])))
            .join("");
        } else {
          return createElement(
            Fragment,
            null,
            parts.map((str, index) =>
              createElement(
                Fragment,
                { key: index },
                index % 2 === 0 ? str : vars[str],
              ),
            ),
          );
        }
      }) as Interpolated<T>[typeof key];
    } else if (
      typeof value === "object" &&
      value !== null &&
      "$$typeof" in value
    ) {
      deep[key] = value as Interpolated<T>[typeof key];
    } else {
      deep[key] = interpolated(value) as Interpolated<T>[typeof key];
    }
  }

  return deep;
}

type InterpolationConfig<V extends string> = {
  _: LocalizedString;
  $: Readonly<Record<V, null>>;
};

export function isInterpolationConfig(
  value: unknown,
): value is InterpolationConfig<string> {
  return (
    typeof value === "object" && value !== null && "_" in value && "$" in value
  );
}

export type Localized<T> = T extends string
  ? LocalizedString
  : T extends bigint | number | boolean | null | undefined
    ? T
    : {
        [key in keyof T]: Localized<T[key]>;
      };
export type LocalizedReactNode =
  | React.ReactElement
  | " "
  | AnyPath
  | LocalizedString
  | PlainString
  | number
  | bigint
  | LocalizedReactNode[]
  | boolean
  | null
  | undefined;
