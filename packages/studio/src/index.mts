const isDevelopment = process.env.NODE_ENV === "development";

export { DockableDialog } from "./ui/DockableDialog.tsx";
export * from "./ui/Tabs.tsx";

import { Fragment, lazy } from "react";

export {
  type LiqvidStudioPlugin,
  type LiqvidStudioRecordingPlugin,
  useIsPreview,
  useIsPreviewOptional,
  useProjectPath,
  useProjectPathOptional,
} from "@liqvid/studio-plugin-api";

export * from "./assets.mts";
export * from "./components/CaptionsEditor/CaptionsEditor.tsx";

/* ------------------------- ambidextrous components ------------------------- */

/**
 * Liqvid dev tools provider.
 *
 * Only operates in development. If you want this in production,
 * use {@link LiqvidDevToolsProviderProd} instead.
 */
export const LiqvidDevToolsProvider = isDevelopment
  ? lazy(() =>
      import("./LiqvidDevToolsProvider.tsx").then((imports) => ({
        default: imports.LiqvidDevToolsProvider,
      })),
    )
  : Fragment;

/** LiqvidDevToolsProvider without env-switching */
export { LiqvidDevToolsProvider as LiqvidDevToolsProviderUnivalent } from "./LiqvidDevToolsProvider.tsx";

/**
 * Liqvid recording control.
 *
 * Only renders in development. If you want this in production,
 * use {@link RecordingControlUnivalent} instead.
 */
export const RecordingControl = isDevelopment
  ? lazy(() =>
      import("./recording/RecordingControl.tsx").then((imports) => ({
        default: imports.RecordingControl,
      })),
    )
  : () => null;

export {
  /** recording control without env-switching */
  RecordingControl as RecordingControlUnivalent,
  type RecordingControlProps,
} from "./recording/RecordingControl.tsx";

/**
 * Given a record of string keys to dynamic import functions, returns an object
 * which will invoke the import function for a key the first time it is accessed,
 * and cache it for subsequent accesses. You can optionally pass an `exportName`
 * as second parameter to return a specific export from the module, assuming that
 * all variants have the same shape.
 *
 * This can be used to dynamically import different modules based on a project
 * parameter, since Next.js does not allow template strings in `import()` calls,
 * and requires Promises to be cached.
 *
 * @example
 * ```ts
 * // first syntax: import all
 * const dynamicProjectPrompt = cacheDynamicImports({
 *   en: () => import("./prompts/en.tsx").then((mod) => mod.ProjectPrompt),
 *   es: () => import("./prompts/es.tsx").then((mod) => mod.ProjectPrompt),
 *   fr: () => import("./prompts/fr.tsx").then((mod) => mod.ProjectPrompt),
 *   zh: () => import("./prompts/zh.tsx").then((mod) => mod.ProjectPrompt),
 * });
 *
 * // second syntax: extract specific export from all
 * const dynamicProjectPrompt = cacheDynamicImports(
 *   {
 *     en: () => import("./prompts/en.tsx"),
 *     es: () => import("./prompts/es.tsx"),
 *     fr: () => import("./prompts/fr.tsx"),
 *     zh: () => import("./prompts/zh.tsx"),
 *   },
 *  "ProjectPrompt",
 * );
 *
 * // ------------------------------ use in client component ------------------------------
 * import { use } from "react";
 *
 * export function ClientContent({
 *   lang,
 * }: {
 *   lang: "en" | "es" | "fr" | "zh";
 * }) {
 *   const ProjectPrompt = use(dynamicProjectPrompt[lang]);
 *   // ...
 * }
 * ```
 */
export function cacheDynamicImports<
  // biome-ignore lint/suspicious/noExplicitAny: variance
  T extends Record<string, () => Promise<any>>,
  K extends keyof Awaited<ReturnType<T[keyof T]>>,
>(
  variants: T,
  exportName: K,
): {
  [key in keyof T]: Promise<Awaited<ReturnType<T[key]>>[K]>;
};
export function cacheDynamicImports<
  // biome-ignore lint/suspicious/noExplicitAny: variance
  T extends Record<string, () => Promise<any>>,
>(
  variants: T,
  exportName?: undefined,
): {
  [key in keyof T]: ReturnType<T[key]>;
};
export function cacheDynamicImports<
  // biome-ignore lint/suspicious/noExplicitAny: variance
  T extends Record<string, () => Promise<any>>,
  K extends keyof Awaited<ReturnType<T[keyof T]>>,
>(variants: T, exportName?: K) {
  const cache = new Map<keyof T, Promise<T[keyof T]>>();
  return new Proxy(variants, {
    get(target, prop: string & keyof T) {
      if (!cache.has(prop)) {
        const promise = target[prop]!();
        cache.set(
          prop,
          exportName ? promise.then((mod) => mod[exportName]) : promise,
        );
      }
      return cache.get(prop)!;
    },
  });
}
