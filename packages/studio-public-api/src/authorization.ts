import type { UserId } from "@liqvid/schemas";
import { Context } from "effect";
import { HttpApiMiddleware, HttpApiSecurity } from "effect/http-api";

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
