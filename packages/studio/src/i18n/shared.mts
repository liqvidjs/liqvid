import { Brand } from "effect";
import { createElement } from "react";
import { Fragment } from "react/jsx-runtime";

/** A localized string. */
export type LocalizedString = string & Brand.Brand<"LocalizedString">;

/** A string that should not be localized. */
export type PlainString = string & Brand.Brand<"PlainString">;

export const PlainString = Brand.nominal<PlainString>();
export type Interpolated<T> = T extends LocalizedString
  ? T
  : {
      [key in keyof T]: T[key] extends InterpolationConfig<infer V>
        ? (vars: Record<V, LocalizedReactNode>) => LocalizedReactNode
        : Interpolated<T[key]>;
    };
export function interpolated<T>(t: T): Interpolated<T> {
  const deep = {} as Interpolated<T>;

  for (const key in t) {
    const value = t[key];

    if (typeof value === "string") {
      deep[key] = value as Interpolated<T>[typeof key];
    } else if (isInterpolationConfig(value)) {
      deep[key] = ((vars: Record<string, LocalizedReactNode>) => {
        return createElement(
          Fragment,
          null,
          value._.split(/\{([^}]+)\}/g).map((str, index) => {
            return createElement(
              Fragment,
              { key: index },
              index % 2 === 0 ? str : vars[str],
            );
          }),
        );
      }) as Interpolated<T>[typeof key];
    } else {
      deep[key] = interpolated(value) as Interpolated<T>[typeof key];
    }
  }

  return deep;
}
export type InterpolationConfig<V extends string> = {
  _: LocalizedString;
  $: Record<V, null>;
};
export const isInterpolationConfig = (
  value: unknown,
): value is InterpolationConfig<string> => {
  return (
    typeof value === "object" && value !== null && "_" in value && "$" in value
  );
};
export type Localized<T> = T extends string
  ? LocalizedString
  : T extends bigint | number | boolean | null | undefined
    ? T
    : {
        [key in keyof T]: Localized<T[key]>;
      };
export type LocalizedReactNode =
  | React.ReactElement
  | LocalizedString
  | PlainString
  | number
  | bigint
  | LocalizedReactNode[]
  | boolean
  | null
  | undefined;
