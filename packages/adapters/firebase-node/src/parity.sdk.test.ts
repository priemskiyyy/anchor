import { randomUUID } from "node:crypto";
import { Anchor } from "@priemskiyyy/anchor";
import {
  firebase as firebaseClient,
  idToken,
} from "@priemskiyyy/anchor-firebase";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  inMemoryPersistence,
  initializeAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { expect, test } from "vitest";

import { createEmulatorAuth, PROJECT_ID } from "src/fakeAuthEmulator.fixture";
import { firebase } from "src/firebase";

test("one Firebase sign-in is the same principal, user, guest and impersonation to the client adapter and to the server adapter", async () => {
  const { auth: adminAuth, emulator } = await createEmulatorAuth();
  const { uid } = emulator.signUp("ada");

  const app = initializeApp(
    {
      apiKey: "anchor-demo-key",
      projectId: PROJECT_ID,
      authDomain: `${PROJECT_ID}.firebaseapp.com`,
    },
    `anchor-parity-${randomUUID()}`,
  );

  const clientAuth = initializeAuth(app, { persistence: inMemoryPersistence });

  connectAuthEmulator(clientAuth, `http://${emulator.host}`, {
    disableWarnings: true,
  });
  await signInWithEmailAndPassword(
    clientAuth,
    "ada@example.com",
    "correct-horse-battery-staple",
  );

  const anchor = new Anchor({
    adapter: firebaseClient({ sdk: clientAuth, tokens: { api: idToken() } }),
  });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const token = await state.session.getToken("api");

  const { state: requestState } = await getRequestSession(
    new Request("https://app.example.com/", {
      headers: { authorization: `${token.scheme} ${token.value}` },
    }),
    { adapter: firebase({ sdk: adminAuth }) },
  );

  expect(state.session.principal).toEqual({
    authority: `https://securetoken.google.com/${PROJECT_ID}`,
    subject: uid,
    tenant: null,
  });
  expect(requestState).toEqual({
    status: "signed-in",
    session: {
      principal: state.session.principal,
      user: state.session.user,
      guest: state.session.guest,
      impersonated: state.session.impersonated,
    },
  });
  anchor.dispose();
  await deleteApp(app);
});
