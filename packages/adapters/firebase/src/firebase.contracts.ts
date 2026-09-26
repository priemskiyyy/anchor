import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { FirebaseApp } from "firebase/app";
import type { Auth, User } from "firebase/auth";
import { expectTypeOf } from "vitest";

import { firebase } from "src/firebase";
import { idToken } from "src/idToken";
import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";

declare const auth: Auth;
declare const app: FirebaseApp;

expectTypeOf(auth).toExtend<FirebaseAuthLike>();

const adapter = firebase({
  sdk: auth,
  tokens: { api: idToken(), reports: idToken() },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<FirebaseSessionUser, Auth, "api" | "reports">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Auth>();

const mapped = firebase({
  sdk: auth,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.uid, created: user.metadata.creationTime };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; created: string | undefined }, Auth, never>
>();

// @ts-expect-error A Firebase app is not its Auth instance.
export const wrongSdk = firebase({ sdk: app });

export const wrongProfile = firebase({
  sdk: auth,
  // @ts-expect-error Firebase mints ID tokens only.
  tokens: { api: { kind: "access-token" } },
});
