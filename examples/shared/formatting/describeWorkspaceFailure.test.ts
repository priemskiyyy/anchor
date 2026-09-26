import { AnchorError } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { describeWorkspaceFailure } from "example-shared/formatting/describeWorkspaceFailure";

test("a failed load says what failed in the provider's name, and never shows a provider's own error", () => {
  const failures = [
    new AnchorError({ code: "SESSION_CHANGED", message: "Replaced." }),
    new AnchorError({ code: "INTERACTION_REQUIRED", message: "Sign in." }),
    new AnchorError({ code: "TOKEN_FAILED", message: "Refresh failed." }),
    new AnchorError({ code: "UNSUPPORTED", message: "No getToken." }),
    new TypeError("secret provider detail"),
  ].map((error) => describeWorkspaceFailure(error, { label: "Okta" }));

  expect(failures).toEqual([
    "The session changed before the token arrived, so Harbor dropped this request.",
    "Okta needs you to sign in again before it sends a token.",
    "Okta could not send a token.",
    "The token request failed with UNSUPPORTED.",
    "Harbor's API can't be reached.",
  ]);
});
