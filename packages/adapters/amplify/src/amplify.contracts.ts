import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import { Amplify } from "aws-amplify";
import * as auth from "aws-amplify/auth";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import type { AuthUser } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { amplify } from "src/amplify";
import { idToken } from "src/idToken";
import type { AmplifyLike } from "src/types/AmplifyLike";
import type { AmplifySessionUser } from "src/types/AmplifySessionUser";
import type { AmplifyUserOf } from "src/types/AmplifyUserOf";

const sdk = { auth, hub: Hub };

expectTypeOf(sdk).toExtend<AmplifyLike>();
expectTypeOf<AmplifyUserOf<typeof sdk>>().toEqualTypeOf<AuthUser>();

const adapter = amplify({
  sdk,
  tokens: { api: accessToken(), identity: idToken() },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<AmplifySessionUser, typeof sdk, "api" | "identity">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<typeof sdk>();

const shaken = amplify({
  sdk: { auth: { fetchAuthSession, getCurrentUser, signOut }, hub: Hub },
});

expectTypeOf(shaken.native.auth.fetchAuthSession).toEqualTypeOf<
  typeof fetchAuthSession
>();

const mapped = amplify({
  sdk,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<AuthUser>();

    return { id: user.userId, loginId: user.signInDetails?.loginId };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; loginId: string | undefined }, typeof sdk, never>
>();

// @ts-expect-error The adapter takes the Auth functions and the Hub, not the Amplify singleton.
export const wrongSdk = amplify({ sdk: Amplify });

export const wrongProfile = amplify({
  sdk,
  // @ts-expect-error Amplify mints the access and ID tokens only.
  tokens: { api: { kind: "session-token" } },
});
