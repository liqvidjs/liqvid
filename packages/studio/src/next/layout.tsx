import type { Metadata } from "next";

import { getConfigSync, initializeServer } from "#_/initialize.mjs";

import "../palette.css";
import "../studio.css";
import "../stylex.css";

import { ColorSchemeProvider } from "@liqvid/color-scheme/react";

import { DevToggleTheme } from "#_/components/DevToggleTheme.js";
import { FloatingNav } from "#_/components/FloatingNav/server.js";

export const metadata: Metadata = {
  description: "Liqvid Studio is a platform for creating interactive videos.",
  title: "Liqvid Studio",
};

export default async function RootLayout({
  children,
}: {
  children?: React.ReactNode;
}) {
  await initializeServer();
  const config = getConfigSync();

  const colorScheme =
    config.ui.theme === "system" ? "light dark" : config.ui.theme;

  return (
    <html lang={config.ui.locale} style={{ colorScheme }}>
      <head />
      <body>
        <ColorSchemeProvider
          initialValue={colorScheme === "light dark" ? undefined : colorScheme}
        >
          <DevToggleTheme />
          <FloatingNav />
          {children}
        </ColorSchemeProvider>
      </body>
    </html>
  );
}
