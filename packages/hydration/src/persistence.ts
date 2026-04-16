"use client";

import { isClient } from "@liqvid/ssr";
import { useCallback, useMemo, useState } from "react";
import Cookies from "universal-cookie";

import type { ArgType, BooleanValueConfig, LocalValueConfig } from "./types.ts";

export type PersistentConfig = {
  /** whether to disable persistence */
  disabled?: boolean;
};

export function usePersist<C extends LocalValueConfig>(
  storage: C,
  { disabled = false }: PersistentConfig = {},
): [
  get: () =>
    | ArgType<C>
    | (C["default"] extends undefined ? null : C["default"]),
  set: (value: ArgType<C>) => void,
] {
  type T = ArgType<C>;
  const [cookies] = useState(() => new Cookies(null));

  return useMemo(() => {
    // quit if disabled
    if (disabled) {
      return [() => (storage.default ?? null) as T, (_value) => {}];
    }

    // do nothing on server
    if (!isClient) {
      return [() => (storage.default ?? null) as T, (_value: T) => {}];
    }

    /** parse raw value retrieved from storage */
    // biome-ignore lint/suspicious/noExplicitAny: types got too complex
    const parse = (value: string | null): any => {
      if (value === null) return (storage.default ?? null) as T;

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
  }, [
    cookies,
    disabled,
    storage.default,
    storage.name,
    storage.source,
    storage.type,
  ]);
}

export function usePersistentState<C extends BooleanValueConfig>(
  storage: C,
  opts?: PersistentConfig,
): [
  value: ArgType<C>,
  setValue: React.Dispatch<React.SetStateAction<ArgType<C>>>,
  toggle: () => void,
];
export function usePersistentState<C extends LocalValueConfig>(
  storage: C,
  opts?: PersistentConfig,
): [
  value: ArgType<C>,
  setValue: React.Dispatch<React.SetStateAction<ArgType<C>>>,
];
export function usePersistentState<C extends LocalValueConfig>(
  storage: C,
  { disabled = false }: PersistentConfig = {},
) {
  const [get, set] = usePersist(storage, { disabled });
  const [state, setState] = useState<ArgType<C>>(() => {
    if (disabled) {
      return storage.default as ArgType<C>;
    }
    return get() ?? (storage.default as ArgType<C>);
  });

  const setPersistedValue = useCallback(
    (valueOrUpdater: React.SetStateAction<ArgType<C>>) => {
      if (typeof valueOrUpdater === "function") {
        setState((prev) => {
          const newValue = (
            valueOrUpdater as (prevState: ArgType<C>) => ArgType<C>
          )(prev);
          set(newValue);
          return newValue;
        });
      } else {
        setState(valueOrUpdater);
        set(valueOrUpdater);
      }
    },
    [set],
  );

  const toggle = useCallback(
    () => setPersistedValue((prev) => !prev as ArgType<C>),
    [setPersistedValue],
  );

  if (storage.type === "boolean") {
    return [state, setPersistedValue, toggle];
  }

  return [state, setPersistedValue];
}
