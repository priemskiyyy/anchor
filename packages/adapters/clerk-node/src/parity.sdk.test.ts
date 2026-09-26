// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import { clerk as clerkClient, sessionToken } from "@priemskiyyy/anchor-clerk";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { Clerk } from "@clerk/clerk-js";
import { expect, test } from "vitest";

import { clerk } from "src/clerk";
import {
  createClerkServer,
  FRONTEND_API,
  PUBLISHABLE_KEY,
} from "src/fakeClerkApi.fixture";

test("one Clerk sign-in is the same principal, user, guest and impersonation to the client adapter and to the server adapter", async () => {
  const server = createClerkServer();

  const { userId } = server.signInBrowser("ada", {
    o: { id: "org_acme", rol: "admin", slg: "acme" },
    act: { sub: "user_support" },
  });

  const instance = new Clerk(PUBLISHABLE_KEY);

  await instance.load({ standardBrowser: false });

  const anchor = new Anchor({
    adapter: clerkClient({ sdk: instance, tokens: { api: sessionToken() } }),
  });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  const token = await state.session.getToken("api");

  const { state: requestState } = await getRequestSession(
    new Request("https://app.anchor.example/", {
      headers: { authorization: `${token.scheme} ${token.value}` },
    }),
    { adapter: clerk({ sdk: server.sdk }) },
  );

  expect(state.session.principal).toEqual({
    authority: `https://${FRONTEND_API}`,
    subject: userId,
    tenant: null,
  });
  expect(state.session.impersonated).toBe(true);
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
});
