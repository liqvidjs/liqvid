"use client";

import { makeContext } from "@liqvid/utils";

const { use: useIsStudio, Provider: IsStudioProvider } = makeContext<boolean>({
  defaultValue: false,
  name: "IsStudio",
});

export { IsStudioProvider, useIsStudio };
