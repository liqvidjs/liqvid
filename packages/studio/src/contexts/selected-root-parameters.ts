"use client";

import { makeContext } from "@liqvid/utils";

export type SelectedRootParameters = Readonly<Record<string, string>>;

const {
  use: useSelectedRootParameters,
  Provider: SelectedRootParametersProvider,
} = makeContext<SelectedRootParameters>({
  defaultValue: {},
  name: "SelectedRootParameters",
});

export { SelectedRootParametersProvider, useSelectedRootParameters };
