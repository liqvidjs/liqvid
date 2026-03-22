/** biome-ignore-all lint/suspicious/noExplicitAny: variance */
/** biome-ignore-all lint/suspicious/noTsIgnore: needs to work in multiple environments */
import { lazy } from "react";

type ComponentLoader<T extends React.ComponentType<any>> = () => Promise<
  T | { default: T }
>;

/**
 * Import a component that should only render in development mode.
 * In production, it will return null.
 */
export function devComponent<T extends React.ComponentType<any>>(
  load: ComponentLoader<T>,
) {
  return splitComponent(
    load,
    async () => () => null,
  ) as React.LazyExoticComponent<T>;
}

/**
 * Import a provider that should only render in development mode.
 * In production, it will pass its children through.
 */
export function devProvider<T extends React.ComponentType<any>>(
  load: ComponentLoader<T>,
) {
  return splitComponent(
    load,
    async () =>
      ({ children }: { children?: React.ReactNode }) =>
        children,
  ) as React.LazyExoticComponent<T>;
}

/**
 * Import a component that should only render in production mode.
 * In development, it will return null.
 */
export function prodComponent<T extends React.ComponentType<any>>(
  load: ComponentLoader<T>,
) {
  return splitComponent(
    async () => () => null,
    load,
  ) as React.LazyExoticComponent<T>;
}

/**
 * Import a provider that should only render in production mode.
 * In development, it will pass its children through.
 */
export function prodProvider<T extends React.ComponentType<any>>(
  load: ComponentLoader<T>,
) {
  return splitComponent(
    async () =>
      ({ children }: { children?: React.ReactNode }) =>
        children,
    load,
  ) as React.LazyExoticComponent<T>;
}

/**
 * Import different versions of a component for development and production mode.
 */
export function splitComponent<
  D extends React.ComponentType<any>,
  P extends React.ComponentType<any>,
>(
  /** function to load the development version of a component */
  loadDev: ComponentLoader<D>,

  /** function to load the production version of a component */
  loadProd: ComponentLoader<P>,
): React.LazyExoticComponent<D | P> {
  return lazy<D | P>(async () => {
    let result: D | P | { default: D | P } | null = null;

    // Next
    try {
      // @ts-ignore
      switch (process.env.NODE_ENV) {
        case "development":
          result = await loadDev();
          break;
        case "production": {
          result = await loadProd();
          break;
        }
      }
    } catch (_e) {
      // Vite

      // @ts-ignore
      if (import.meta.env.DEV) {
        result = await loadDev();
        // @ts-ignore
      } else if (import.meta.env.PROD) {
        result = await loadProd();
      }
    }

    if (!result) throw new Error("unrecognized build environment");

    // return component
    if ("default" in result) return result;
    return {
      default: result,
    };
  });
}
