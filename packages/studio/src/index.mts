export { DockableDialog } from "./ui/DockableDialog";
export * from "./ui/Tabs";

import { devComponent, devProvider } from "@liqvid/ambidexterity/react";

export type {
  LiqvidStudioPlugin,
  LiqvidStudioRecordingPlugin,
} from "@liqvid/studio-plugin-api";

export * from "./assets.mts";
export {
  LiqvidDevToolsProvider as LiqvidDevToolsProviderProd,
  useProjectContext,
} from "./LiqvidDevToolsProvider";
export {
  RecordingControl as RecordingControlProd,
  type RecordingControlProps,
} from "./recording/RecordingControl";

/* ------------------------- dev-only exports ------------------------- */

/**
 * Liqvid dev tools provider.
 *
 * Only operates in development. If you want this in production,
 * use {@link LiqvidDevToolsProviderProd} instead.
 */
export const LiqvidDevToolsProvider = devProvider(() =>
  import("./LiqvidDevToolsProvider").then(
    (imports) => imports.LiqvidDevToolsProvider,
  ),
);

/**
 * Liqvid recording control.
 *
 * Only renders in development. If you want this in production,
 * use {@link RecordingControlProd} instead.
 */
export const RecordingControl = devComponent(() =>
  import("./recording/RecordingControl").then(
    (imports) => imports.RecordingControl,
  ),
);
