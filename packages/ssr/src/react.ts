/** biome-ignore-all lint/suspicious/noExplicitAny: variance */

import type { ComponentType } from "react";

import "./types.ts";

/**
 * Requires Next.js >= 16.4.0 with `experimental.turbopackCrossModuleConstants` enabled.
 */
export const devComponent: <T extends ComponentType<any>>(component: T) => T =
  import.meta.env.DEV ? (component) => component : (): any => () => null;
