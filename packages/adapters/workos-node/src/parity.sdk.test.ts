// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import {
  workos as workosClient,
  workosRefreshes,
} from "@priemskiyyy/anchor-workos";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { createClient } from "@workos-inc/authkit-js";
import { TextDecoder, TextEncoder } from "node:util";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import {
  CLIENT_ID,
  COOKIE_PASSWORD,
  createWorkosServer,
} from "src/fakeWorkosApi.fixture";
import { workos } from "src/workos";

// The sealing of @workos-inc/node checks for Node's Uint8Array and ArrayBuffer, which Vitest's jsdom environment replaces with jsdom's.
beforeEach(() => {
  vi.stubGlobal(
    "Uint8Array",
    Object.getPrototypeOf(Buffer.prototype).constructor,
  );
  vi.stubGlobal("ArrayBuffer", Buffer.alloc(0).buffer.constructor);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.stubGlobal("TextDecoder", TextDecoder);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState({}, "", "/");
});

test("one WorkOS sign-in is the same principal, user, guest and impersonation to the client adapter and to the server adapter", async () => {
  const server = createWorkosServer();

  const { userId, cookie } = await server.signUp("ada", {
    organizationId: "org_acme",
    impersonator: { email: "support@example.com", reason: "Ticket 42" },
  });

  // The page AuthKit redirects back to after the sign-in, with the code and the verifier the sign-in stored.
  sessionStorage.setItem("workos:code-verifier", "verifier_anchor");
  history.replaceState({}, "", `/callback?code=${server.issueCode("ada")}`);

  const refreshes = workosRefreshes();

  const client = await createClient(CLIENT_ID, {
    redirectUri: "http://localhost:3000/callback",
    onRefresh: refreshes.handleRefresh,
    onRefreshFailure: refreshes.handleRefreshFailure,
  });

  const anchor = new Anchor({
    adapter: workosClient({ sdk: client, refreshes }),
  });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  const { state: requestState } = await getRequestSession(
    new Request("https://app.example.com/", { headers: { cookie } }),
    {
      adapter: workos({ sdk: server.sdk, cookiePassword: COOKIE_PASSWORD }),
    },
  );

  expect(state.session.principal).toEqual({
    authority: "workos",
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
  client.dispose();
});
