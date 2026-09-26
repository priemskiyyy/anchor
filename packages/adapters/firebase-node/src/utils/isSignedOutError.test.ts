import { FirebaseAuthError } from "firebase-admin/auth";
import { expect, test } from "vitest";

import { isSignedOutError } from "src/utils/isSignedOutError";

const createError = (code: string, message = "") =>
  new FirebaseAuthError({ code, message });

test("an expired or revoked credential, and a disabled, deleted or foreign-tenant user, are no session", () => {
  for (const code of [
    "session-cookie-expired",
    "session-cookie-revoked",
    "id-token-expired",
    "id-token-revoked",
    "user-disabled",
    "user-not-found",
    "mismatching-tenant-id",
  ]) {
    expect(isSignedOutError(createError(code), "session-cookie")).toBe(true);
  }
});

test("auth/argument-error is no session only in words that name the credential verified, never a failure to fetch Google's public keys", () => {
  expect(
    isSignedOutError(
      createError(
        "argument-error",
        "Firebase session cookie has invalid signature.",
      ),
      "session-cookie",
    ),
  ).toBe(true);
  expect(
    isSignedOutError(
      createError(
        "argument-error",
        'Firebase ID token has "kid" claim which does not correspond to a known public key. Most likely the ID token is expired.',
      ),
      "id-token",
    ),
  ).toBe(true);
  expect(
    isSignedOutError(
      createError("argument-error", "Firebase ID token has invalid signature."),
      "session-cookie",
    ),
  ).toBe(false);
  expect(
    isSignedOutError(
      createError(
        "argument-error",
        "Error while making request: getaddrinfo ENOTFOUND www.googleapis.com. Error code: ENOTFOUND",
      ),
      "session-cookie",
    ),
  ).toBe(false);
  expect(
    isSignedOutError(
      createError(
        "argument-error",
        "Error fetching public keys for Google certs: invalid_request",
      ),
      "id-token",
    ),
  ).toBe(false);
});

test("any other failure, or something that is not a Firebase error, is not", () => {
  expect(
    isSignedOutError(createError("internal-error"), "session-cookie"),
  ).toBe(false);
  expect(
    isSignedOutError(createError("invalid-credential"), "session-cookie"),
  ).toBe(false);
  expect(
    isSignedOutError(
      { code: "auth/session-cookie-revoked", message: "session cookie" },
      "session-cookie",
    ),
  ).toBe(false);
  expect(isSignedOutError(new Error("session cookie"), "session-cookie")).toBe(
    false,
  );
  expect(isSignedOutError(null, "session-cookie")).toBe(false);
});
