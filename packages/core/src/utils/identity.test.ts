import { expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorSession } from "src/types/AnchorSession";
import type { SessionAnswer } from "src/types/SessionAnswer";
import { Anchor } from "src/utils/Anchor";
import {
  AUTHORITY,
  actionRequired,
  signedIn,
  signedOut,
} from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const start = async (answer: SessionAnswer<User>) => {
  const mock = createMockAdapter<User, "api">({ answer, tokens: { api: {} } });
  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  return { mock, anchor };
};

const getSignedInSession = (
  anchor: Anchor<User, unknown, "api">,
): AnchorSession<User, "api"> => {
  const state = anchor.session.get();

  if (state.status !== "signed-in" && state.status !== "action-required") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("a session's key is a random UUID", async () => {
  const { anchor } = await start(signedIn("ada"));

  expect(getSignedInSession(anchor).key).toMatch(UUID);
});

test("the same security context keeps its key while the user's data changes, and an identical answer publishes nothing", async () => {
  const { mock, anchor } = await start(signedIn("ada"));
  const first = getSignedInSession(anchor);
  const listener = vi.fn();

  anchor.session.subscribe(listener);
  mock.push(signedIn("ada", { user: { name: "Ada Lovelace" } }));

  const renamed = getSignedInSession(anchor);

  expect(renamed.key).toBe(first.key);
  expect(renamed.user).toEqual({ name: "Ada Lovelace" });
  expect(listener.mock.calls).toEqual([[]]);

  const state = anchor.session.get();

  mock.push(signedIn("ada", { user: { name: "Ada Lovelace" } }));

  expect(anchor.session.get()).toBe(state);
  expect(listener.mock.calls).toEqual([[]]);
});

test.each([
  ["subject", signedIn("grace")],
  ["tenant", signedIn("ada", { tenant: "acme" })],
  ["context", signedIn("ada", { context: "org_2" })],
  ["guest flag", signedIn("ada", { guest: true })],
  ["impersonated flag", signedIn("ada", { impersonated: true })],
  [
    "authority",
    {
      ...signedIn("ada"),
      principal: {
        authority: "https://other.example.com",
        subject: "ada",
        tenant: null,
      },
    },
  ],
])(
  "a change of the %s replaces the session with a new key",
  async (_, next) => {
    const { mock, anchor } = await start(signedIn("ada", { context: "org_1" }));
    const first = getSignedInSession(anchor);

    mock.push(next);

    expect(getSignedInSession(anchor).key).not.toBe(first.key);
  },
);

test("signing out and in again in the same context gives a new key: a key is never reused", async () => {
  const { mock, anchor } = await start(signedIn("ada"));
  const first = getSignedInSession(anchor).key;

  mock.push(signedOut);
  mock.push(signedIn("ada"));

  expect(getSignedInSession(anchor).key).not.toBe(first);
});

test("moving between signed-in and action-required in the same context keeps the key and the generation", async () => {
  const { mock, anchor } = await start(signedIn("ada"));
  const key = getSignedInSession(anchor).key;
  const generation = anchor.diagnostics.get().session.generation;

  mock.push(actionRequired("ada", "setup-mfa"));

  expect(anchor.session.get()).toMatchObject({
    status: "action-required",
    action: { kind: "setup-mfa" },
    session: { key },
  });

  mock.push(actionRequired("ada", "choose-organization"));

  expect(anchor.session.get()).toMatchObject({
    action: { kind: "choose-organization" },
  });

  mock.push(signedIn("ada"));

  expect(getSignedInSession(anchor).key).toBe(key);
  expect(anchor.diagnostics.get().session.generation).toBe(generation);
});

test("the generation grows with every replacement and every ending of a session, and never otherwise", async () => {
  const { mock, anchor } = await start(signedOut);
  const generations = () => anchor.diagnostics.get().session.generation;

  expect(generations()).toBe(0);

  mock.push(signedIn("ada"));
  mock.push(signedIn("ada", { user: { name: "Ada Lovelace" } }));

  expect(generations()).toBe(1);

  mock.push(signedIn("grace"));

  expect(generations()).toBe(2);

  mock.push(signedOut);
  mock.push(signedOut);

  expect(generations()).toBe(3);
});

test("a session's getToken and end stay the same functions across updates of that session", async () => {
  const { mock, anchor } = await start(signedIn("ada"));
  const first = getSignedInSession(anchor);

  mock.push(signedIn("ada", { user: { name: "Ada Lovelace" } }));

  const updated = getSignedInSession(anchor);

  expect(updated).not.toBe(first);
  expect(updated.getToken).toBe(first.getToken);
  expect(updated.end).toBe(first.end);
});

test("a user object the adapter changes after answering does not change the published user", async () => {
  const user = { name: "Ada" };
  const { mock, anchor } = await start(signedOut);

  mock.push(signedIn("ada", { user }));
  user.name = "Mallory";

  expect(getSignedInSession(anchor).user).toEqual({ name: "Ada" });
  expect(getSignedInSession(anchor).principal).toEqual({
    authority: AUTHORITY,
    subject: "ada",
    tenant: null,
  });
});
