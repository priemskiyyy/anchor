import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
} from "@supabase/supabase-js";
import { expect, test } from "vitest";

import { isSignedOutError } from "src/utils/isSignedOutError";

test("only a missing session and Supabase Auth refusing the session's credentials are no session", () => {
  expect(isSignedOutError(new AuthSessionMissingError())).toBe(true);

  for (const code of [
    "bad_jwt",
    "user_not_found",
    "user_banned",
    "refresh_token_not_found",
    "refresh_token_already_used",
    "session_expired",
  ]) {
    expect(isSignedOutError(new AuthApiError("Refused", 403, code))).toBe(true);
  }

  expect(isSignedOutError(new AuthRetryableFetchError("fetch failed", 0))).toBe(
    false,
  );
  expect(
    isSignedOutError(
      new AuthApiError("Rate limit", 429, "over_request_rate_limit"),
    ),
  ).toBe(false);
  expect(
    isSignedOutError(new AuthApiError("Unexpected", 500, "unexpected_failure")),
  ).toBe(false);
  expect(
    isSignedOutError(new AuthApiError("Bad request", 400, undefined)),
  ).toBe(false);
  expect(isSignedOutError(new AuthUnknownError("Not JSON", null))).toBe(false);
});
