import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { OktaAuth, UserClaims } from "@okta/okta-auth-js";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { okta } from "src/okta";
import type { OktaAuthLike } from "src/types/OktaAuthLike";
import type { OktaClaimsOf } from "src/types/OktaClaimsOf";
import type { OktaSessionUser } from "src/types/OktaSessionUser";

declare const oktaAuth: OktaAuth;

expectTypeOf(oktaAuth).toExtend<OktaAuthLike>();
expectTypeOf<OktaClaimsOf<OktaAuth>>().toEqualTypeOf<UserClaims>();

const adapter = okta({
  sdk: oktaAuth,
  tokens: { api: accessToken(), reports: accessToken() },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<OktaSessionUser, OktaAuth, "api" | "reports">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<OktaAuth>();

const mapped = okta({
  sdk: oktaAuth,
  user: (claims) => {
    expectTypeOf(claims).toEqualTypeOf<UserClaims>();

    return { id: claims.sub, email: claims.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; email: string | undefined }, OktaAuth, never>
>();

// @ts-expect-error The adapter takes the OktaAuth instance, not its token manager.
export const wrongSdk = okta({ sdk: oktaAuth.tokenManager });

export const wrongProfile = okta({
  sdk: oktaAuth,
  // @ts-expect-error The token manager mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
