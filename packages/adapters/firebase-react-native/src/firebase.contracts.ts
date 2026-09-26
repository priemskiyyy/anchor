import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { FirebaseApp } from "@react-native-firebase/app";
import type { Auth, User, getAuth } from "@react-native-firebase/auth";
import { expectTypeOf } from "vitest";

import type { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";
import { idToken } from "src/idToken";
import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";

type Fake = ReturnType<typeof createFakeFirebaseAuth>;

declare const auth: Auth;
declare const app: FirebaseApp;

expectTypeOf<ReturnType<typeof getAuth>>().toEqualTypeOf<Auth>();
expectTypeOf(auth).toExtend<FirebaseAuthLike>();
expectTypeOf<keyof Fake["sdk"]>().toExtend<keyof Auth>();
expectTypeOf<keyof NonNullable<ReturnType<Fake["current"]>>>().toExtend<
  keyof User
>();

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

// @ts-expect-error A React Native Firebase app is not its Auth instance.
export const wrongSdk = firebase({ sdk: app });

export const wrongProfile = firebase({
  sdk: auth,
  // @ts-expect-error Firebase mints ID tokens only.
  tokens: { api: { kind: "access-token" } },
});
