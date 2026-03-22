/** biome-ignore-all lint/suspicious/noTsIgnore: needs to work in multiple environments */
export const isClient = typeof globalThis.window !== "undefined";
export const isServer = !isClient;

/**
 * Run different code in development vs in production.
 */
export function splitCode<D, P>(
  /** function to call in development */
  loadDev: () => D,
  /** function to call in production */
  loadProd: () => P,
) {
  // Next
  try {
    // @ts-ignore
    switch (process.env.NODE_ENV) {
      case "development":
        return loadDev();
      case "production": {
        return loadProd();
      }
    }
  } catch (_e) {
    // Vite

    // @ts-ignore
    if (import.meta.env.DEV) {
      return loadDev();
      // @ts-ignore
    } else if (import.meta.env.PROD) {
      return loadProd();
    }
  }

  // loading on server???
  return loadDev();
}

export * from "./serialization";
