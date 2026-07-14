const isDevelopment = process.env.NODE_ENV === "development";

export { DockableDialog } from "./ui/DockableDialog.tsx";
export * from "./ui/Tabs.tsx";

import { Fragment, lazy } from "react";

export type {
  LiqvidStudioPlugin,
  LiqvidStudioRecordingPlugin,
} from "@liqvid/studio-plugin-api";

export * from "./assets.mts";
export * from "./components//CaptionsEditor/CaptionsEditor.tsx";

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
