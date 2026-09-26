import { expect, test } from "vitest";

import { describeEndResult } from "example-shared/formatting/describeEndResult";

test("an ending reads as what it proved on this device and at the provider", () => {
  expect(
    describeEndResult(
      { local: "completed", remote: "completed", navigation: null },
      { label: "Supabase" },
    ),
  ).toEqual([
    "Signed out on this device.",
    "Supabase ended its own session too.",
  ]);
  expect(
    describeEndResult(
      { local: "completed", remote: "not-applicable", navigation: null },
      { label: "Firebase" },
    ),
  ).toEqual([
    "Signed out on this device.",
    "Firebase has no session of its own to end.",
  ]);
  expect(
    describeEndResult(
      { local: "not-applicable", remote: "unknown", navigation: null },
      { label: "Okta" },
    ),
  ).toEqual([
    "This device no longer held the session.",
    "Okta's own session may still be open.",
  ]);
});
