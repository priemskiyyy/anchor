import { expect, test } from "vitest";

import { isSignedOutReason } from "src/utils/isSignedOutReason";

test("only the reasons that say the request carries no session are signed out, and a refresh that failed on the way never is", () => {
  for (const reason of [
    "session-token-and-uat-missing",
    "client-uat-but-no-session-token",
    "session-token-but-no-client-uat",
    "session-token-iat-before-client-uat",
    "token-invalid",
    "token-invalid-algorithm",
    "token-invalid-signature",
    "token-invalid-authorized-parties",
    "token-verification-failed",
    "token-type-mismatch",
    "jwk-kid-mismatch",
    "session-token-expired-refresh-non-eligible-no-refresh-cookie",
    "session-token-expired-refresh-non-eligible-non-get",
    "session-token-expired-refresh-missing-session-token",
    "session-token-expired-refresh-missing-refresh-token",
    "session-token-expired-refresh-expired-session-token-decode-failed",
    "session-token-expired-refresh-expired-session-token-missing-sid-claim",
  ]) {
    expect(isSignedOutReason(reason)).toBe(true);
  }

  for (const reason of [
    "unexpected-error",
    "secret-key-invalid",
    "jwk-local-missing",
    "jwk-remote-failed-to-load",
    "jwk-remote-invalid",
    "jwk-remote-missing",
    "jwk-failed-to-resolve",
    "session-token-nbf",
    "session-token-iat-in-the-future",
    "dev-browser-missing",
    "satellite-needs-syncing",
    "token-expired",
    "session-token-expired-refresh-fetch-error",
    "session-token-expired-refresh-unexpected-bapi-error",
    "session-token-expired-refresh-unexpected-sdk-error",
    "session-token-expired-refresh-invalid-session-token",
    "session-token-expired-refresh-missing-api-client",
    "session-token-expired-refresh-rate_limit_exceeded",
  ]) {
    expect(isSignedOutReason(reason)).toBe(false);
  }
});
