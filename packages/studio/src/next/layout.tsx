import "../palette.css";
import "../studio.css";
import "../stylex.css";

import type { Metadata } from "next";

import { DevToggleTheme } from "#_/components/DevToggleTheme.js";
import { FloatingNav } from "#_/components/FloatingNav/server";
import { IsStudioProvider } from "#_/contexts/is-studio";
import { LocaleProvider } from "#_/contexts/locale";
import { getConfigSync, initializeServer } from "#_/initialize";
import { colorSchemeSpecifierToCss } from "#_/utils/misc.client";

export const metadata: Metadata = {
  description: "Liqvid Studio is a platform for creating interactive videos.",
  title: "Liqvid Studio",
};

// biome-ignore lint/style/noDefaultExport: Next.js
export default async function RootLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await initializeServer();
  const config = getConfigSync();

  return (
    <LocaleProvider value={config.ui.locale}>
      <html
        lang={config.ui.locale}
        style={{ colorScheme: colorSchemeSpecifierToCss(config.ui.theme) }}
      >
        <head />
        <body>
          <IsStudioProvider value={true}>
            <DevToggleTheme />
            <FloatingNav />
            {children}
          </IsStudioProvider>
        </body>
      </html>
    </LocaleProvider>
  );
}
