"use client";

import type { ParameterValues } from "@liqvid/schemas";
import { makeContext } from "@liqvid/utils";

const {
  use: useSelectedRootParameters,
  Provider: SelectedRootParametersProvider,
} = makeContext<ParameterValues>({
  defaultValue: {},
  name: "SelectedRootParameters",
});

export { SelectedRootParametersProvider, useSelectedRootParameters };
