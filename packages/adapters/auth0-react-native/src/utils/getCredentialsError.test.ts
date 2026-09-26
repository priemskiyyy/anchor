import { expect, test } from "vitest";

import { getCredentialsError } from "src/utils/getCredentialsError";

const createCredentialsManagerError = (type: string, code = type) =>
  Object.assign(new Error(type), { name: code, code, type });

test.each([
  ["RENEW_FAILED", "RENEW_FAILED"],
  ["RENEW_FAILED", "invalid_grant"],
  ["NO_REFRESH_TOKEN", "NO_REFRESH_TOKEN"],
  ["SESSION_EXPIRED", "SESSION_EXPIRED"],
  ["DPOP_KEY_MISSING", "DPOP_KEY_MISSING"],
  ["DPOP_KEY_MISMATCH", "DPOP_KEY_MISMATCH"],
])(
  "%s, from the native code %s, asks for the user with INTERACTION_REQUIRED and keeps the error as its cause",
  (type, code) => {
    const error = createCredentialsManagerError(type, code);

    expect(getCredentialsError(error)).toMatchObject({
      name: "AnchorError",
      code: "INTERACTION_REQUIRED",
      cause: error,
    });
  },
);

test("no credentials at all is SESSION_CHANGED, because the credentials manager holds no session any more", () => {
  const error = createCredentialsManagerError("NO_CREDENTIALS");

  expect(getCredentialsError(error)).toMatchObject({
    name: "AnchorError",
    code: "SESSION_CHANGED",
    cause: error,
  });
});

test("any other failure is kept as react-native-auth0 threw it", () => {
  const offline = createCredentialsManagerError("NO_NETWORK");
  const exchange = createCredentialsManagerError("API_EXCHANGE_FAILED");
  const plain = new TypeError("Network request failed");

  expect(getCredentialsError(offline)).toBe(offline);
  expect(getCredentialsError(exchange)).toBe(exchange);
  expect(getCredentialsError(plain)).toBe(plain);
  expect(getCredentialsError({ type: "toString" })).toEqual({
    type: "toString",
  });
  expect(getCredentialsError(null)).toBe(null);
});
