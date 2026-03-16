import { isClient } from "@liqvid/ssr";
import { useMemo, useState } from "react";
import Cookies from "universal-cookie";

import type { ArgType, LocalValueConfig } from "./types.ts";

export function usePersist<C extends LocalValueConfig>(
  storage: C,
  { disabled = false } = {},
): [get: () => ArgType<C> | null, set: (value: ArgType<C>) => void] {
  type T = ArgType<C>;
  const [cookies] = useState(() => new Cookies(null));

  return useMemo(() => {
    // quit if disabled
    if (disabled) {
      return [() => null, (_value) => {}];
    }

    // do nothing on server
    if (!isClient) {
      return [() => (storage.default as T) ?? null, (_value: T) => {}];
    }

    /** parse raw value retrieved from storage */
    const parse = (value: string | null): ArgType<C> | null => {
      if (value === null) return (storage.default as T) ?? null;

      switch (storage.type) {
        case "boolean":
          return (value === "true") as T;
        case "number":
          return parseFloat(value) as T;
        default:
          return value as T;
      }
    };

    // different storage sources
    switch (storage.source) {
      case "cookie":
        return [
          () => parse(cookies.get(storage.name, { doNotParse: true })),
          (value: T) => {
            cookies.set(storage.name, String(value));
          },
        ];
      case "localStorage":
        return [
          () => parse(localStorage.getItem(storage.name)),
          (value: T) => {
            localStorage.setItem(storage.name, String(value));
          },
        ];
      case "search":
        return [
          () =>
            parse(
              new URLSearchParams(location.search).get(storage.name),
            ) as T | null,
          (_value: T) => {},
        ];
      case "sessionStorage":
        return [
          () => parse(sessionStorage.getItem(storage.name)),
          (value) => {
            sessionStorage.setItem(storage.name, String(value));
          },
        ];
    }
  }, [cookies, disabled, storage]);
}
