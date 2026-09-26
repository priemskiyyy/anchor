import { expect, test } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { SessionAnswer } from "src/types/SessionAnswer";
import { Anchor } from "src/utils/Anchor";
import { actionRequired, signedIn } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const start = async (answer: SessionAnswer<User>, hold = false) => {
  const mock = createMockAdapter<User, "api" | "reports">({
    answer,
    tokens: { api: {}, reports: {} },
    hold: { getToken: hold },
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  return { mock, anchor };
};

test("a session mints for itself: the adapter hears the session's principal and context", async () => {
  const { mock, anchor } = await start(signedIn("ada", { context: "org_1" }));
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  await expect(state.session.getToken("api")).resolves.toEqual({
    value: "api:ada:1",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(mock.tokens.map(({ request }) => request)).toEqual([
    {
      profile: "api",
      forceRefresh: false,
      session: {
        principal: {
          authority: "https://login.example.com",
          subject: "ada",
          tenant: null,
        },
        context: "org_1",
      },
      signal: expect.any(AbortSignal),
    },
  ]);
});

test("each call gets its own token from the provider: Anchor keeps no token once a request settles", async () => {
  const { anchor } = await start(signedIn("ada"));
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const first = await state.session.getToken("api");
  const second = await state.session.getToken("api");

  expect([first.value, second.value]).toEqual(["api:ada:1", "api:ada:2"]);
});

test("a session in action-required refuses tokens with ACTION_REQUIRED, and mints again once the step is done", async () => {
  const { mock, anchor } = await start(actionRequired("ada", "setup-mfa"));
  const blocked = anchor.session.get();

  if (blocked.status !== "action-required") {
    throw new Error("Expected a blocked session.");
  }

  await expect(blocked.session.getToken("api")).rejects.toMatchObject({
    code: "ACTION_REQUIRED",
  });
  expect(mock.tokens).toEqual([]);

  mock.push(signedIn("ada"));

  await expect(blocked.session.getToken("api")).resolves.toMatchObject({
    value: "api:ada:1",
  });
});

test("a token pending when the provider blocks the session is refused when it lands", async () => {
  const { mock, anchor } = await start(signedIn("ada"), true);
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const token = state.session.getToken("reports");

  mock.push(actionRequired("ada", "reset-password"));
  mock.tokens[0]?.settle();

  await expect(token).rejects.toMatchObject({ code: "ACTION_REQUIRED" });
});

test("a signed-out or replaced session's pending token rejects at once, without waiting for the adapter", async () => {
  const { mock, anchor } = await start(signedIn("ada"), true);
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const token = state.session.getToken("api");

  mock.push({ status: "signed-out" });

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(mock.tokens[0]?.request.signal.aborted).toBe(true);
});
