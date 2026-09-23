import { Context } from "effect";
import { HttpApiMiddleware, HttpApiSecurity } from "effect/unstable/httpapi";

import type { UserId } from "./branded.ts";
import { Unauthorized } from "./errors.ts";

export type ApiUser = Readonly<{
  email: string;
  id: UserId;
  name: string;
  tokenId: string;
  username: string;
}>;

export class CurrentUser extends Context.Service<CurrentUser, ApiUser>()(
  "liqvid/ApiCurrentUser",
) {}

export class Authorization extends HttpApiMiddleware.Service<
  Authorization,
  {
    provides: CurrentUser;
  }
>()("liqvid/ApiAuthorization", {
  error: Unauthorized,
  security: { bearer: HttpApiSecurity.bearer },
}) {}
