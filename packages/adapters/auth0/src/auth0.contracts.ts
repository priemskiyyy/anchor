import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { Auth0Client, IdToken } from "@auth0/auth0-spa-js";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";
import type { Auth0ClaimsOf } from "src/types/Auth0ClaimsOf";
import type { Auth0ClientLike } from "src/types/Auth0ClientLike";
import type { Auth0SessionUser } from "src/types/Auth0SessionUser";

declare const client: Auth0Client;

expectTypeOf(client).toExtend<Auth0ClientLike>();
expectTypeOf<Auth0ClaimsOf<Auth0Client>>().toEqualTypeOf<IdToken>();

const adapter = auth0({
  sdk: client,
  tokens: { api: accessToken({ audience: "https://api.example.com" }) },
  returnTo: "https://app.example.com",
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<Auth0SessionUser, Auth0Client, "api">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Auth0Client>();

const mapped = auth0({
  sdk: client,
  user: (claims) => {
    expectTypeOf(claims).toEqualTypeOf<IdToken>();

    return { email: claims.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ email: string | undefined }, Auth0Client, never>
>();

// @ts-expect-error The adapter takes the client, not a promise of one.
export const wrongSdk = auth0({ sdk: Promise.resolve(client) });

export const wrongProfile = auth0({
  sdk: client,
  // @ts-expect-error Auth0 mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
