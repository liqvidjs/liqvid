"use client";

import type { JSONValue } from "@liqvid/ssr/serde";
import type { RelativeDir } from "effect-paths";
import { createContext, useContext, useEffect, useState } from "react";

import CommonTranslations from "#_/.translations/en.json";
import { COMMON_TRANSLATIONS_DIR } from "#_/conventions.mjs";
import {
  type Interpolated,
  interpolated,
  type Localized,
} from "#_/i18n/shared.mjs";
import { getTranslationsFromServer } from "#_/server-actions.js";

import type { CommonTranslations as CommonTranslationsType } from "./i18n.mts";

/* ------------------------------ translations ------------------------------ */

// biome-ignore lint/suspicious/noExplicitAny: context holds any translation shape
const translationContext = createContext<any>({});
translationContext.displayName = "Translation";

export function useTranslations<T>(): Interpolated<Localized<T>> {
  return interpolated(useContext(translationContext) as Localized<T>);
}

export function TranslationProvider<T>({
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
export function useAsyncTranslations<T extends Record<string, JSONValue>>(
  defaultValue: T,
  componentDir: RelativeDir,
): Localized<T> {
  const [translations, setTranslations] = useState<Localized<T>>(
    defaultValue as Localized<T>,
  );

  useEffect(() => {
    getTranslationsFromServer<Localized<T>>(componentDir).then((localized) => {
      setTranslations({
        ...(defaultValue as Localized<T>),
        ...localized,
      });
    });
  }, [componentDir, defaultValue]);

  return translations as Localized<T>;
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
export function useCommonTranslations(): Localized<CommonTranslationsType> {
  return useAsyncTranslations(
    CommonTranslations as CommonTranslationsType,
    COMMON_TRANSLATIONS_DIR,
  );
}
