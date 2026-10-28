"use client";

import { useEffect, useState } from "react";

export function useServerTranslations<T extends object>(
  defaults: T,
  load: () => Promise<T>,
  errorMessage: string,
): T {
  const [translations, setTranslations] = useState(defaults);

  useEffect(() => {
    load().then(setTranslations, (error: unknown) => {
      console.error(errorMessage, error);
    });
  }, [errorMessage, load]);

  return translations;
}
