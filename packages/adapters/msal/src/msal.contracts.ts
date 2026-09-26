import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type {
  AccountInfo,
  IPublicClientApplication,
  PublicClientApplication,
} from "@azure/msal-browser";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { msal } from "src/msal";
import type { MsalAccountOf } from "src/types/MsalAccountOf";
import type { MsalLike } from "src/types/MsalLike";
import type { MsalSessionUser } from "src/types/MsalSessionUser";

declare const client: PublicClientApplication;
declare const nestable: IPublicClientApplication;

expectTypeOf(client).toExtend<MsalLike>();
expectTypeOf(nestable).toExtend<MsalLike>();
expectTypeOf<
  MsalAccountOf<PublicClientApplication>
>().toEqualTypeOf<AccountInfo>();

const adapter = msal({
  sdk: client,
  initialized: client.initialize(),
  tokens: {
    graph: accessToken({ scopes: ["User.Read"] }),
    api: accessToken({ scopes: ["api://anchor/read"] }),
  },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<MsalSessionUser, PublicClientApplication, "graph" | "api">
>();
expectTypeOf(
  new Anchor({ adapter }).native,
).toEqualTypeOf<PublicClientApplication>();

const mapped = msal({
  sdk: client,
  user: (account) => {
    expectTypeOf(account).toEqualTypeOf<AccountInfo>();

    return { id: account.homeAccountId, roles: account.idTokenClaims?.roles };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<
    { id: string; roles: string[] | undefined },
    PublicClientApplication,
    never
  >
>();

// @ts-expect-error The adapter takes the client, not the promise initialize() answers.
export const wrongSdk = msal({ sdk: client.initialize() });

export const wrongProfile = msal({
  sdk: client,
  // @ts-expect-error An MSAL profile names the scopes its token is for.
  tokens: { api: { kind: "access-token" } },
});
