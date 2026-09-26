import { expect, test } from "vitest";

import { getSessionToken } from "src/utils/getSessionToken";

const identity = {
  principal: {
    authority: "https://api.example.com",
    subject: "user_42",
    tenant: null,
  },
  context: "session_7",
};

test("a token minted for the session's subject is the session's, an access token with no scheme unless answered", () => {
  expect(
    getSessionToken({ value: "token_1", subject: "user_42" }, identity),
  ).toEqual({
    value: "token_1",
    kind: "access-token",
    scheme: null,
  });
  expect(
    getSessionToken(
      {
        value: "token_2",
        subject: "user_42",
        kind: "session-token",
        scheme: "Bearer",
      },
      identity,
    ),
  ).toEqual({ value: "token_2", kind: "session-token", scheme: "Bearer" });
});

test("a token minted for another subject is refused as SESSION_CHANGED", () => {
  expect(() =>
    getSessionToken({ value: "token_1", subject: "user_43" }, identity),
  ).toThrow(
    expect.objectContaining({
      code: "SESSION_CHANGED",
      message:
        "The server minted the token for another user than the session's.",
    }),
  );
});

test("a token that names another tenant or context than the session's is refused as SESSION_CHANGED, and one that names none is bound by its subject alone", () => {
  for (const token of [
    { value: "token_1", subject: "user_42", tenant: "tenant_acme" },
    { value: "token_2", subject: "user_42", context: "session_8" },
    { value: "token_3", subject: "user_42", context: null },
  ]) {
    expect(() => getSessionToken(token, identity)).toThrow(
      expect.objectContaining({
        code: "SESSION_CHANGED",
        message:
          "The server minted the token in another tenant or context than the session's.",
      }),
    );
  }

  expect(
    getSessionToken(
      {
        value: "token_4",
        subject: "user_42",
        tenant: null,
        context: "session_7",
      },
      identity,
    ),
  ).toEqual({ value: "token_4", kind: "access-token", scheme: null });
});
