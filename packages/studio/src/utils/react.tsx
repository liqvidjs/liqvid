import type { RelativeDir } from "effect-paths";
import {
  createContext,
  Fragment,
  useContext,
  useEffect,
  useState,
} from "react";

import { COMMON_TRANSLATIONS_DIR } from "../conventions.mts";
import { getTranslationsFromServer } from "../server-actions.ts";

import type { CommonTranslations as CommonTranslationsType } from "./i18n.mts";

import CommonTranslations from "../.translations/en.json";

type TranslationJson = {
  [key: string]: string | TranslationJson;
};

/* ------------------------------ translations ------------------------------ */

const translationContext = createContext<TranslationJson>({});
translationContext.displayName = "Translation";

type TranslationInterpolation<T> = {
  [K in keyof T]: T[K] extends string
    ? T[K]
    : T[K] extends { readonly __template: string }
      ? (
          interpolations: Record<
            Exclude<keyof T[K], "__template">,
            React.ReactNode
          >,
        ) => React.ReactNode
      : TranslationInterpolation<T[K]>;
};

export function useTranslations<
  T extends TranslationJson,
>(): TranslationInterpolation<T> {
  return makeInterpolator(useContext(translationContext) as T);
}

export function TranslationProvider<T extends TranslationJson>({
  children,
  t,
}: {
  children?: React.ReactNode;
  t: T;
}) {
  return (
    <translationContext.Provider value={t}>
      {children}
    </translationContext.Provider>
  );
}

/**
 * For client components that we don't control (may be consumed by users),
 * asynchronously load translations, using default locale until the
 * translations are loaded.
 */
export function useAsyncTranslations<T>(
  defaultValue: T,
  componentDir: RelativeDir,
) {
  const [translations, setTranslations] = useState<T>(defaultValue);

  useEffect(() => {
    getTranslationsFromServer<T>(componentDir).then((localized) => {
      setTranslations({ ...defaultValue, ...localized });
    });
  }, [componentDir, defaultValue]);

  return translations;
}

/**
 * Get translations for commonly-used words like "close", "cancel", etc.,
 * shared across the studio UI. For use in client components.
 *
 * Renders the default-locale strings immediately, then swaps in the localized
 * strings once they load. See {@link getCommonTranslations} for the
 * server-component equivalent.
 *
 * @example
 * ```tsx
 * "use client";
 *
 * function MyButton() {
 *   const common = useCommonTranslations();
 *   return <button>{common.close}</button>;
 * }
 * ```
 */
export function useCommonTranslations(): CommonTranslationsType {
  return useAsyncTranslations(
    CommonTranslations as CommonTranslationsType,
    COMMON_TRANSLATIONS_DIR,
  );
}

function makeInterpolator<T extends TranslationJson>(
  translations: T,
): TranslationInterpolation<T> {
  // biome-ignore lint/suspicious/noExplicitAny: this is ok
  const interpolated: any = {};

  for (const key in translations) {
    const value = translations[key];

    if (typeof value === "string") {
      interpolated[key] = value;
    } else if (typeof value === "object") {
      if ("__template" in value && typeof value.__template === "string") {
        interpolated[key] = (
          interpolations: Record<string, React.ReactNode>,
        ) => {
          return (value.__template as string)
            .split(/$\{([^}]+)\}/g)
            .map((s, i) => (
              <Fragment key={i}>{i % 2 === 0 ? s : interpolations[s]}</Fragment>
            ));
        };
      } else {
        interpolated[key] = makeInterpolator(value);
      }
    }
  }

  return interpolated;
}
