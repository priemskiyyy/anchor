import { expect, test } from "vitest";

import { describeSessionChange } from "example-shared/formatting/describeSessionChange";
import type { SessionSummary } from "example-shared/lab/types/SessionSummary";

const ADA: SessionSummary = {
  runtime: { id: 1 },
  status: "signed-in",
  key: "key-ada",
  principal: { authority: "supabase", subject: "ada", tenant: null },
  name: "Ada Moreau",
  organization: "harbor",
};

const NO_SESSION: SessionSummary = {
  ...ADA,
  status: "signed-out",
  key: null,
  principal: null,
  name: null,
  organization: null,
};

test("a first session and a lost one each say what happened to the key", () => {
  expect(describeSessionChange(null, ADA)).toEqual({
    kind: "new-key",
    reason: "A session began, so a new key.",
  });
  expect(describeSessionChange(ADA, NO_SESSION)).toEqual({
    kind: "no-key",
    reason: "Signed out: the session and its key are gone.",
  });
  expect(
    describeSessionChange(ADA, { ...NO_SESSION, status: "unavailable" }),
  ).toEqual({
    kind: "no-key",
    reason:
      "The provider could not be read: no session, and nobody was signed out.",
  });
  expect(describeSessionChange(NO_SESSION, NO_SESSION)).toBe(null);
});

test("a new key names what changed: another provider, another start, another person or another organization", () => {
  const nexts: SessionSummary[] = [
    {
      ...ADA,
      key: "k2",
      runtime: { id: 2 },
      principal: { authority: "better-auth", subject: "ada", tenant: null },
    },
    { ...ADA, key: "k2", runtime: { id: 2 } },
    {
      ...ADA,
      key: "k2",
      principal: { authority: "supabase", subject: "grace", tenant: null },
    },
    { ...ADA, key: "k2", organization: "summit" },
    { ...ADA, key: "k2" },
  ];

  expect(nexts.map((next) => describeSessionChange(ADA, next)?.reason)).toEqual(
    [
      "Another provider vouches for this person, so a new key.",
      "Harbor started again, and a key is never reused: a new key.",
      "Another person, so a new key.",
      "Another organization, so a new key.",
      "The same person in a new security context, so a new key.",
    ],
  );
});

test("the same key says why it stayed when the name or the blocked step changed, and says nothing otherwise", () => {
  expect(describeSessionChange(ADA, { ...ADA, name: "Ada M." })).toEqual({
    kind: "same-key",
    reason:
      "The name changed and the key stayed: the same person in the same security context.",
  });
  expect(
    describeSessionChange(ADA, { ...ADA, status: "action-required" }),
  ).toEqual({
    kind: "same-key",
    reason: "The provider blocks the same session on a step: the key stays.",
  });
  expect(
    describeSessionChange({ ...ADA, status: "action-required" }, ADA),
  ).toEqual({
    kind: "same-key",
    reason: "The step is done: the same session keeps its key.",
  });
  expect(describeSessionChange(ADA, { ...ADA })).toBe(null);
});
