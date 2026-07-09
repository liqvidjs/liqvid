import { Effect } from "effect";

import { getServerState } from "../initialize.mts";

export function getRoot() {
  return Effect.sync(() => ({ serverState: getServerState() }));
}
