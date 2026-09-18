"use client";

import type { Locale } from "@liqvid/schemas";
import { makeContext } from "@liqvid/utils";

// TODO: this can probably be merged in somewhere else...
const { use: useLocale, Provider: LocaleProvider } = makeContext<Locale>({
  defaultValue: "en",
  name: "Locale",
});

export { LocaleProvider, useLocale };
