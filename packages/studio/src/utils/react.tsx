import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { getTranslationsFromServer } from "../server-actions.ts";

export function useToggle(defaultValue?: boolean): {
  set: React.Dispatch<React.SetStateAction<boolean>>;
  toggle: () => void;
  value: boolean;
} {
  const [value, set] = useState(!!defaultValue);

  const toggle = useCallback(() => {
    set((x) => !x);
  }, []);

  return { set, toggle, value };
}

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
export function useAsyncTranslations<T>(defaultValue: T, componentDir: string) {
  const [translations, setTranslations] = useState<T>(defaultValue);

  useEffect(() => {
    getTranslationsFromServer<T>(componentDir).then((localized) => {
      setTranslations({ ...defaultValue, ...localized });
    });
  }, [componentDir, defaultValue]);

  return translations;
}
