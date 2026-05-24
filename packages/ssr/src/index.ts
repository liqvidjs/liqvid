/** whether we are currently in a browser environment */
export const IS_CLIENT = typeof globalThis.window !== "undefined";

/** @deprecated use `IS_CLIENT` for proper tree-shaking */
export const isClient = IS_CLIENT;

/** whether we are currently in a server environment */
export const IS_SERVER = !IS_CLIENT;

/** @deprecated use `IS_SERVER` for proper tree-shaking */
export const isServer = IS_SERVER;

export * from "./deserialize.ts";
export * from "./serialize.ts";
