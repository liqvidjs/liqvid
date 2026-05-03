import { useColorMode } from "@docusaurus/theme-common";
// @ts-expect-error defined externally
import SiteStorage from "@generated/site-storage";
import type { LocalValueConfig } from "@liqvid/hydration";
import { usePersist } from "@liqvid/hydration";
import type { ReactNode } from "react";

import { ColorSchemeProvider } from "./react";

export const persistColorScheme = {
  default: "light" as const,
  enum: ["light", "dark"] as const,
  name: `theme${SiteStorage.namespace}`,
  source: "localStorage",
  type: "string",
} satisfies LocalValueConfig;

/**
 * Set the Liqvid color scheme provider to the value of Docusaurus's color mode, and subscribe to updates.
 *
 * This component works around the issue https://github.com/facebook/docusaurus/issues/7986
 * by reading the cookie. This is usually desired, however it can cause hydration issues. You
 * can solve the hydration issues using the `@liqvid/hydration` package. However, you can also
 * opt out of this fix by setting `cautiousHydration: true`.
 */
export function SyncDocusaurusColorSchemeProviderWithLiqvid({
  cautiousHydration = false,
  children,
}: {
  /**
   * If true, use stale value on initial load to avoid hydration errors.
   */
  cautiousHydration?: boolean;
  children: ReactNode;
}) {
  // note that get() and colorMode are equal except for possibly the first render
  // even if we didn't have cautiousHydration, we would need to call useColorMode()
  // to subscribe to updates
  const [get] = usePersist(persistColorScheme);

  const { colorMode } = useColorMode();

  return (
    <ColorSchemeProvider value={cautiousHydration ? colorMode : get()}>
      {children}
    </ColorSchemeProvider>
  );
}
