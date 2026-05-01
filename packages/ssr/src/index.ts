/** whether we are currently in a browser environment */
export const isClient = typeof globalThis.window !== "undefined";

/** whether we are currently in a server environment */
export const isServer = !isClient;

export * from "./deserialize.ts";
export * from "./serialize.ts";
