import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type Auth0 from "react-native-auth0";
import type { User, parseIdToken } from "react-native-auth0";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";
import type { createFakeAuth0 } from "src/fakeAuth0.fixture";
import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";
import type { Auth0Like } from "src/types/Auth0Like";
import type { Auth0SessionUser } from "src/types/Auth0SessionUser";
import type { Auth0UserOf } from "src/types/Auth0UserOf";

type Fake = ReturnType<typeof createFakeAuth0>;

declare const client: Auth0;
declare const parse: typeof parseIdToken;

const domain = "acme.us.auth0.com";

expectTypeOf(client).toExtend<Auth0Like>();
expectTypeOf(parse).toExtend<Auth0IdTokenParserLike>();
expectTypeOf<Auth0UserOf<typeof parseIdToken>>().toEqualTypeOf<User>();
expectTypeOf<keyof Fake["sdk"]["credentialsManager"]>().toExtend<
  keyof Auth0["credentialsManager"]
>();

const adapter = auth0({
  sdk: client,
  domain,
  parseIdToken: parse,
  tokens: {
    api: accessToken({ audience: "https://api.example.com" }),
    login: accessToken(),
  },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<Auth0SessionUser, Auth0, "api" | "login">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Auth0>();

const mapped = auth0({
  sdk: client,
  domain,
  parseIdToken: parse,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.sub, email: user.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; email: string | undefined }, Auth0, never>
>();

export const wrongSdk = auth0({
  // @ts-expect-error The adapter takes the client, not its credentials manager.
  sdk: client.credentialsManager,
  domain,
  parseIdToken: parse,
});

// @ts-expect-error The domain names the sessions' authority, so it is required.
export const withoutDomain = auth0({ sdk: client, parseIdToken: parse });

export const withoutSubject = auth0({
  sdk: client,
  domain,
  // @ts-expect-error A parser whose user has no subject cannot name a session.
  parseIdToken: (idToken: string) => ({ iss: idToken }),
});

export const wrongProfile = auth0({
  sdk: client,
  domain,
  parseIdToken: parse,
  // @ts-expect-error The credentials manager mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
