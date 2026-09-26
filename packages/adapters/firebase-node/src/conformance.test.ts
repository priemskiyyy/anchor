import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";

import { createEmulatorAuth } from "src/fakeAuthEmulator.fixture";
import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { firebase } from "src/firebase";

const getSessionCookie = (headers: Headers) =>
  (headers.get("cookie") ?? "").slice("__session=".length);

testServerSessionAdapter({
  name: "firebase-node over the fake Auth",
  createFixture: () => {
    const fake = createFakeFirebaseAuth();

    return {
      adapter: firebase({ sdk: fake.sdk, checkRevoked: true }),
      native: fake.sdk,
      signIn: (name) => {
        const { sessionCookie } = fake.signIn(name);

        return {
          headers: new Headers({ cookie: `__session=${sessionCookie}` }),
          subject: name,
        };
      },
      signOut: (headers) => {
        fake.revoke(getSessionCookie(headers).slice("cookie_".length));
      },
    };
  },
});

testServerSessionAdapter({
  name: "firebase-node over the real firebase-admin Auth in emulator mode",
  createFixture: async () => {
    const { auth, emulator } = await createEmulatorAuth();
    const uids = new Map<string, string>();

    return {
      adapter: firebase({ sdk: auth, checkRevoked: true }),
      native: auth,
      signIn: (name) => {
        const { uid, sessionCookie } = emulator.signUp(name);

        uids.set(sessionCookie, uid);

        return {
          headers: new Headers({ cookie: `__session=${sessionCookie}` }),
          subject: uid,
        };
      },
      signOut: (headers) => {
        emulator.revoke(uids.get(getSessionCookie(headers)) ?? "");
      },
    };
  },
});
