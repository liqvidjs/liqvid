import type { RelativeDir } from "effect-paths";
import { createContext, useContext, useEffect, useState } from "react";

import { COMMON_TRANSLATIONS_DIR } from "../conventions.mts";
import { getTranslationsFromServer } from "../server-actions.ts";

import type { CommonTranslations as CommonTranslationsType } from "./i18n.mts";

import CommonTranslations from "../.translations/en.json";

/* ------------------------------ translations ------------------------------ */
const translationContext = createContext<unknown>({});
translationContext.displayName = "Translation";

export function useTranslations<T>() {
  return useContext(translationContext) as T;
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
