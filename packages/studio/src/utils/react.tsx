import { createContext, useCallback, useContext, useState } from "react";

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
