import { Effect } from "effect";

import { getServerState } from "#_/initialize.mjs";

export function getRoot() {
  return Effect.sync(() => ({ serverState: getServerState() }));
}
