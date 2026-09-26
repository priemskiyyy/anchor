import { expect, test } from "vitest";

import { isSessionUser } from "src/utils/isSessionUser";

const user = (iss: string, sub: string, sid: string) => ({
  access_token: "access",
  token_type: "Bearer",
  profile: { iss, sub, sid },
});

const identity = (authority: string, subject: string, context: string) => ({
  principal: { authority, subject, tenant: null },
  context,
});

test("the stored user is the session's when its issuer, subject and context all match", () => {
  const ada = user("https://id.example.com", "ada", "sid_1");

  expect(
    isSessionUser(
      ada,
      identity("https://id.example.com", "ada", '[null,null,"sid_1",null]'),
    ),
  ).toBe(true);
  expect(
    isSessionUser(
      ada,
      identity("https://other.example.com", "ada", '[null,null,"sid_1",null]'),
    ),
  ).toBe(false);
  expect(
    isSessionUser(
      ada,
      identity("https://id.example.com", "grace", '[null,null,"sid_1",null]'),
    ),
  ).toBe(false);
  expect(
    isSessionUser(
      ada,
      identity("https://id.example.com", "ada", '[null,null,"sid_2",null]'),
    ),
  ).toBe(false);
  expect(
    isSessionUser(
      null,
      identity("https://id.example.com", "ada", '[null,null,"sid_1",null]'),
    ),
  ).toBe(false);
});
