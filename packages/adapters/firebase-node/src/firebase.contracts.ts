import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import type {
  Auth,
  DecodedIdToken,
  TenantAwareAuth,
} from "firebase-admin/auth";
import { getAuth as getClientAuth } from "firebase/auth";
import { expectTypeOf } from "vitest";

import type { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";
import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseDecodedTokenOf } from "src/types/FirebaseDecodedTokenOf";
import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";

type FakeSdk = ReturnType<typeof createFakeFirebaseAuth>["sdk"];

declare const tenantAuth: TenantAwareAuth;

const auth = getAuth(initializeApp({ projectId: "anchor-project" }));

expectTypeOf(auth).toExtend<FirebaseAuthLike>();
expectTypeOf(tenantAuth).toExtend<FirebaseAuthLike>();
expectTypeOf<FakeSdk>().toExtend<
  Pick<Auth, "verifySessionCookie" | "verifyIdToken">
>();
expectTypeOf<FirebaseDecodedTokenOf<Auth>>().toEqualTypeOf<DecodedIdToken>();

expectTypeOf(firebase({ sdk: auth })).toEqualTypeOf<
  ServerSessionAdapter<FirebaseSessionUser, Auth>
>();
expectTypeOf(firebase({ sdk: tenantAuth, checkRevoked: true })).toEqualTypeOf<
  ServerSessionAdapter<FirebaseSessionUser, TenantAwareAuth>
>();

const mapped = firebase({
  sdk: auth,
  cookie: "session",
  user: (token) => {
    expectTypeOf(token).toEqualTypeOf<DecodedIdToken>();

    return { id: token.uid, provider: token.firebase.sign_in_provider };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  ServerSessionAdapter<{ id: string; provider: string }, Auth>
>();

export const clientAuth = firebase({
  // @ts-expect-error The server adapter takes firebase-admin's Auth, not the client SDK's.
  sdk: getClientAuth(),
});

export const cookieFunction = firebase({
  sdk: auth,
  // @ts-expect-error The cookie is named, not found by a function.
  cookie: (headers: Headers) => headers.get("cookie"),
});
