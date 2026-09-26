import { expect, test } from "vitest";

import { createFakeClerk } from "src/fakeClerk.fixture";
import { sessionToken } from "src/sessionToken";
import { getSessionToken } from "src/utils/getSessionToken";

const tokens = {
  api: sessionToken(),
  supabase: sessionToken({ template: "supabase" }),
};

const request = (
  subject: string,
  context: string,
  profile = "api",
  forceRefresh = false,
) => ({
  profile,
  forceRefresh,
  session: {
    principal: {
      authority: "https://clerk.example.com",
      subject,
      tenant: null,
    },
    context,
  },
  signal: new AbortController().signal,
});

test("the session's token is minted by its own session, from the cache unless forced, with the template a profile names", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_ada");

  await expect(
    getSessionToken(
      fake.sdk,
      tokens,
      request("user_ada", '[null,"sess_1",null]'),
    ),
  ).resolves.toEqual({
    value: "session.user_ada.1",
    kind: "session-token",
    scheme: "Bearer",
  });
  await expect(
    getSessionToken(
      fake.sdk,
      tokens,
      request("user_ada", '[null,"sess_1",null]', "supabase", true),
    ),
  ).resolves.toMatchObject({ value: "supabase.user_ada.2" });
  expect(fake.tokens).toEqual([
    { skipCache: false, session: "sess_1" },
    { skipCache: true, template: "supabase", session: "sess_1" },
  ]);
});

test.each([
  ["another user", "user_grace", '["org_acme","sess_1",null]'],
  ["another organization", "user_ada", '["org_globex","sess_1",null]'],
  ["another Clerk session", "user_ada", '["org_acme","sess_2",null]'],
])(
  "%s is refused with SESSION_CHANGED before Clerk is asked",
  async (_other, subject, context) => {
    const fake = createFakeClerk();

    fake.signIn("user_ada", { organization: "org_acme" });

    await expect(
      getSessionToken(fake.sdk, tokens, request(subject, context)),
    ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
    expect(fake.tokens).toEqual([]);
  },
);

test("an organization switch while Clerk mints is SESSION_CHANGED, never the other organization's token", async () => {
  const fake = createFakeClerk();
  const session = fake.signIn("user_ada", { organization: "org_acme" });
  const mint = session.getToken;

  session.getToken = async (options) => {
    fake.setActiveOrganization("org_globex");

    return mint(options);
  };

  await expect(
    getSessionToken(
      fake.sdk,
      tokens,
      request("user_ada", '["org_acme","sess_1",null]'),
    ),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
});

test("a token asked for while Clerk switches back to the same session waits for it instead of refusing", async () => {
  const fake = createFakeClerk();

  fake.signIn("user_ada");
  fake.beginTransition();

  const token = getSessionToken(
    fake.sdk,
    tokens,
    request("user_ada", '[null,"sess_1",null]'),
  );

  await Promise.resolve();

  expect(fake.tokens).toEqual([]);

  fake.endTransition();

  await expect(token).resolves.toMatchObject({ value: "session.user_ada.1" });
});

test("no token from Clerk is TOKEN_FAILED, and an undeclared profile is INVALID_CONFIGURATION", async () => {
  const fake = createFakeClerk();
  const session = fake.signIn("user_ada");

  session.getToken = async () => null;

  await expect(
    getSessionToken(
      fake.sdk,
      tokens,
      request("user_ada", '[null,"sess_1",null]'),
    ),
  ).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    message: "Clerk answered no session token.",
  });
  await expect(
    getSessionToken(
      fake.sdk,
      tokens,
      request("user_ada", '[null,"sess_1",null]', "billing"),
    ),
  ).rejects.toMatchObject({ code: "INVALID_CONFIGURATION" });
});

test("a failure Clerk throws is kept as it threw it", async () => {
  const fake = createFakeClerk();

  const failure = Object.assign(
    new Error("Network request failed while offline."),
    {
      code: "clerk_offline",
    },
  );

  fake.signIn("user_ada");
  fake.failures.token = failure;

  await expect(
    getSessionToken(
      fake.sdk,
      tokens,
      request("user_ada", '[null,"sess_1",null]'),
    ),
  ).rejects.toBe(failure);
});
