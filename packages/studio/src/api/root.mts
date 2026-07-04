import { Effect } from "effect";

import { getServerState } from "../initialize.mts";
import { loadLiqvidConfig } from "../jobs/watch-config.mts";

export function getRoot() {
  return loadLiqvidConfig();
  return Effect.sync(() => ({ serverState: getServerState() }));
}
