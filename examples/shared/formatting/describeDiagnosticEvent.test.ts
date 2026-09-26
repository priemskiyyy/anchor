import type { AnchorDiagnosticType } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { describeDiagnosticEvent } from "example-shared/formatting/describeDiagnosticEvent";

const KEY = { key: "3f2a9c1b-5d6e-4f70-8a9b-0c1d2e3f4a5b" };

const EVENTS: [AnchorDiagnosticType, unknown][] = [
  ["anchor started", undefined],
  ["anchor start failed", { code: "START_FAILED" }],
  ["anchor disposed", undefined],
  ["read started", undefined],
  ["read completed", { status: "signed-in" }],
  ["read failed", { code: "READ_FAILED" }],
  ["read superseded", undefined],
  ["answer invalid", { operation: "push" }],
  ["session accepted", { status: "signed-in" }],
  ["session updated", { status: "signed-in" }],
  ["session signed out", undefined],
  ["session unavailable", { code: "READ_FAILED" }],
  ["token requested", { profile: "api", forceRefresh: true }],
  ["token joined", { profile: "api", forceRefresh: false }],
  ["token received", { profile: "api", forceRefresh: false }],
  [
    "token failed",
    { profile: "api", forceRefresh: false, code: "TOKEN_FAILED" },
  ],
  [
    "token discarded",
    { profile: "api", forceRefresh: true, code: "SESSION_CHANGED" },
  ],
  ["end started", undefined],
  ["end completed", { local: "completed", remote: "unknown" }],
  ["end failed", { code: "END_FAILED" }],
  ["callback ignored", { callback: "session" }],
];

test("every diagnostic event reads as one plain sentence, naming its session by the short key", () => {
  expect(
    EVENTS.map(([type, context]) =>
      describeDiagnosticEvent(
        { type, session: KEY, timestamp: 0, context },
        { label: "Auth0", name: "Auth0" },
      ),
    ),
  ).toEqual([
    "Anchor opened the adapter for Auth0 and is reading the session.",
    "Anchor could not open the adapter for Auth0.",
    "This Anchor was disposed: its pending work rejected, and later callbacks change nothing.",
    "Anchor asked Auth0 for the session.",
    "Auth0 answered signed-in.",
    "The read failed with READ_FAILED, so the state stays as it was.",
    "A read answered after a newer event, so Anchor discarded its answer.",
    "The adapter answered outside the contract, so Anchor refused the answer.",
    "A new session under key 3f2a9c1b.",
    "The session under key 3f2a9c1b changed in place and kept its key.",
    "Signed out, on the provider's word or a completed sign-out.",
    "The first read failed with READ_FAILED: unavailable, never signed out.",
    "Harbor asked for a fresh api token for key 3f2a9c1b.",
    "Another caller joined the api token request in flight.",
    "The api token for key 3f2a9c1b arrived.",
    "The api token request failed with TOKEN_FAILED.",
    "The api token for key 3f2a9c1b arrived after its session was gone, and Anchor discarded it.",
    "Harbor started ending the session under key 3f2a9c1b.",
    "The ending answered: this device completed, the provider unknown.",
    "The ending failed with END_FAILED, and the session stays.",
    "A late session callback reached a disposed Anchor, which ignored it.",
  ]);
});

test("a session accepted while blocked on a step says so", () => {
  expect(
    describeDiagnosticEvent(
      {
        type: "session accepted",
        session: KEY,
        timestamp: 0,
        context: { status: "action-required" },
      },
      { label: "Your backend", name: "your backend" },
    ),
  ).toBe("A new session, blocked on a step, under key 3f2a9c1b.");
});

test("a sentence starts with the provider's label and names it by its name after that", () => {
  const backend = { label: "Your backend", name: "your backend" };

  expect(
    describeDiagnosticEvent(
      { type: "read started", session: null, timestamp: 0, context: undefined },
      backend,
    ),
  ).toBe("Anchor asked your backend for the session.");
  expect(
    describeDiagnosticEvent(
      {
        type: "read completed",
        session: null,
        timestamp: 0,
        context: { status: "signed-in" },
      },
      backend,
    ),
  ).toBe("Your backend answered signed-in.");
});
