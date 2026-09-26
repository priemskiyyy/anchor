import { expect, test } from "vitest";

import type { IdentifiedAnswer } from "src/types/internal/IdentifiedAnswer";
import { getSecurityContextFingerprint } from "src/utils/internal/answers/getSecurityContextFingerprint";

const answer: IdentifiedAnswer<{ name: string }> = {
  status: "signed-in",
  principal: {
    authority: "https://clerk.example.com",
    subject: "user_1",
    tenant: null,
  },
  user: { name: "Ada" },
  context: "sess_1|org_1",
  guest: false,
  impersonated: false,
};

test("the same identity gives the same key whatever the user data and the status", () => {
  expect(
    getSecurityContextFingerprint({
      ...answer,
      status: "action-required",
      action: { kind: "choose-organization" },
      user: { name: "Ada Lovelace" },
    }),
  ).toBe(getSecurityContextFingerprint(answer));
});

test.each([
  [
    "authority",
    {
      ...answer,
      principal: {
        ...answer.principal,
        authority: "https://auth0.example.com",
      },
    },
  ],
  ["tenant", { ...answer, principal: { ...answer.principal, tenant: "acme" } }],
  [
    "subject",
    { ...answer, principal: { ...answer.principal, subject: "user_2" } },
  ],
  ["context", { ...answer, context: "sess_1|org_2" }],
  ["missing context", { ...answer, context: null }],
  ["guest flag", { ...answer, guest: true }],
  ["impersonated flag", { ...answer, impersonated: true }],
])("a change of the %s gives another key", (_, changed) => {
  expect(getSecurityContextFingerprint(changed)).not.toBe(
    getSecurityContextFingerprint(answer),
  );
});

test("parts cannot run into each other: a separator inside a part is not a boundary", () => {
  const first = {
    ...answer,
    principal: { ...answer.principal, tenant: "a", subject: "b|c" },
  };

  const second = {
    ...answer,
    principal: { ...answer.principal, tenant: "a|b", subject: "c" },
  };

  expect(getSecurityContextFingerprint(first)).not.toBe(
    getSecurityContextFingerprint(second),
  );
});
