import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { IdTokenClaims, OidcClient, UserManager } from "oidc-client-ts";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { oidc } from "src/oidc";
import type { OidcProfileOf } from "src/types/OidcProfileOf";
import type { OidcSessionUser } from "src/types/OidcSessionUser";
import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";

declare const userManager: UserManager;
declare const client: OidcClient;

expectTypeOf(userManager).toExtend<OidcUserManagerLike>();
expectTypeOf<OidcProfileOf<UserManager>>().toEqualTypeOf<IdTokenClaims>();

const adapter = oidc({
  sdk: userManager,
  tokens: { api: accessToken(), reports: accessToken() },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<OidcSessionUser, UserManager, "api" | "reports">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<UserManager>();

const mapped = oidc({
  sdk: userManager,
  user: (profile) => {
    expectTypeOf(profile).toEqualTypeOf<IdTokenClaims>();

    return { id: profile.sub, email: profile.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; email: string | undefined }, UserManager, never>
>();

// @ts-expect-error The adapter takes the UserManager, not the bare OidcClient.
export const wrongSdk = oidc({ sdk: client });

export const wrongProfile = oidc({
  sdk: userManager,
  // @ts-expect-error An OpenID Connect session mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
