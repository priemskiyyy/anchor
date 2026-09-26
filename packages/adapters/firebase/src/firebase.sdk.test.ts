import { Anchor } from "@priemskiyyy/anchor";
import { deleteApp, initializeApp } from "firebase/app";
import { inMemoryPersistence, initializeAuth } from "firebase/auth";
import { expect, test } from "vitest";

import { firebase } from "src/firebase";
import { idToken } from "src/idToken";

test("the real Firebase Auth SDK, restored with no user, resolves as signed out and ends nothing", async () => {
  const app = initializeApp(
    {
      apiKey: "anchor-demo-key",
      projectId: "anchor-demo",
      authDomain: "anchor-demo.firebaseapp.com",
    },
    "anchor-sdk-test",
  );

  const auth = initializeAuth(app, { persistence: inMemoryPersistence });

  const anchor = new Anchor({
    adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
  });

  await anchor.start();

  expect(anchor.native).toBe(auth);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await anchor.sync();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
  await deleteApp(app);
});
