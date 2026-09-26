import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

const idToken = {
  idToken: "id",
  claims: {
    iss: "https://anchor.okta.com/oauth2/default",
    sub: "00u_ada",
    sid: "idx_1",
  },
};

test("an auth state Okta does not count as authenticated is signed out", () => {
  expect(
    getSessionAnswer({ isAuthenticated: false, idToken }, (claims) => claims),
  ).toEqual({ status: "signed-out" });
  expect(getSessionAnswer({}, (claims) => claims)).toEqual({
    status: "signed-out",
  });
});

test("an auth state Okta does not count as authenticated but that still holds a refresh token cannot tell, so it throws, never signed out", () => {
  expect(() =>
    getSessionAnswer(
      { isAuthenticated: false, refreshToken: { refreshToken: "refresh" } },
      (claims) => claims,
    ),
  ).toThrow(
    "okta-auth-js holds a refresh token but no tokens it can use: it could not renew them.",
  );
});

test("an authenticated auth state is signed in as its ID token's issuer and subject, with the Okta session as its context", () => {
  expect(
    getSessionAnswer({ isAuthenticated: true, idToken }, (claims) => ({
      id: claims.sub,
    })),
  ).toEqual({
    status: "signed-in",
    principal: {
      authority: "https://anchor.okta.com/oauth2/default",
      subject: "00u_ada",
      tenant: null,
    },
    user: { id: "00u_ada" },
    context: "idx_1",
    guest: false,
    impersonated: false,
  });
});

test("an auth state that carries an error throws it, because it is no evidence either way", () => {
  const failure = new Error("transformAuthState failed");

  expect(() =>
    getSessionAnswer(
      { isAuthenticated: false, idToken, error: failure },
      (claims) => claims,
    ),
  ).toThrow(failure);
});

test("an authenticated auth state without an ID token throws, because nothing names its user", () => {
  expect(() =>
    getSessionAnswer({ isAuthenticated: true }, (claims) => claims),
  ).toThrow(TypeError);
});
