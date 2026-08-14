/** whether we are currently in a browser environment */
export const IS_CLIENT = typeof globalThis.window !== "undefined";

/** whether we are currently in a server environment */
export const IS_SERVER = !IS_CLIENT;

/** whether we are currently in a development environment */
export const IS_DEV = process.env.NODE_ENV === "development";

/** whether we are currently in a production environment */
export const IS_PROD = process.env.NODE_ENV === "production";

export * from "./deserialize.ts";
export * from "./serialize.ts";
