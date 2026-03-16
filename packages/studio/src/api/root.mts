import { getServerState } from "../initialize.mts";

export async function getRoot() {
  return Response.json({ serverState: getServerState() });
}
