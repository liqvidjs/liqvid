import { HttpApi } from "effect/unstable/httpapi";

import { Files } from "./groups/files/index.ts";
import { Projects } from "./groups/projects/index.ts";
import { Tokens } from "./groups/tokens/index.ts";
import { Workspaces } from "./groups/workspaces/index.ts";

export const LiqvidStudioPublicApi = HttpApi.make("liqvid-studio-api").add(
  Files,
  Projects,
  Tokens,
  Workspaces,
);

export * from "./authorization.ts";
export * from "./branded.ts";
export * from "./errors.ts";
export * from "./groups/files/public.ts";
export * from "./groups/projects/public.ts";
export * from "./groups/tokens/public.ts";
export * from "./groups/workspaces/public.ts";
