import { HttpApi } from "effect/unstable/httpapi";

import { Files } from "./groups/files/index.ts";
import { Health } from "./groups/health/index.ts";
import { Identity } from "./groups/identity/index.ts";
import { Projects } from "./groups/projects/index.ts";
import { Tokens } from "./groups/tokens/index.ts";
import { Workspaces } from "./groups/workspaces/index.ts";

export const LiqvidStudioPublicApi = HttpApi.make("liqvid-studio-api")
  .add(Files, Health, Identity, Projects, Tokens, Workspaces)
  .prefix("/api/v1");

export * from "./authorization.ts";
export * from "./errors.ts";
export * from "./groups/files/public.ts";
export * from "./groups/health/public.ts";
export * from "./groups/identity/public.ts";
export * from "./groups/projects/public.ts";
export * from "./groups/tokens/public.ts";
export * from "./groups/workspaces/public.ts";
