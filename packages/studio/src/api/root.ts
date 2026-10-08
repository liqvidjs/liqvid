import { Effect } from "effect";

import { getServerState } from "#_/initialize";

export function getRoot() {
  return Effect.sync(() => ({ serverState: getServerState() }));
}
