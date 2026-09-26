import { expect, test } from "vitest";

import { getRequestCredential } from "src/utils/getRequestCredential";

const credentialOf = (headers: Record<string, string>, cookie = "__session") =>
  getRequestCredential(new Headers(headers), cookie);

test("a bearer ID token is the request's credential, ahead of its session cookie, whatever the scheme's case", () => {
  expect(
    credentialOf({
      authorization: "Bearer id.token",
      cookie: "__session=cookie",
    }),
  ).toEqual({ kind: "id-token", value: "id.token" });
  expect(credentialOf({ authorization: "bearer id.token" })).toEqual({
    kind: "id-token",
    value: "id.token",
  });
});

test("without a bearer ID token the credential is the named session cookie, the first of that name, decoded", () => {
  expect(
    credentialOf({
      authorization: "Basic YWRhOnNlY3JldA==",
      cookie: "theme=dark; __session=first; __session=second",
    }),
  ).toEqual({ kind: "session-cookie", value: "first" });
  expect(
    credentialOf({ cookie: "__session=a%2Eb; session=c%2Ed" }, "session"),
  ).toEqual({ kind: "session-cookie", value: "c.d" });
  expect(credentialOf({ cookie: "__session=%E0%A4%A" })).toEqual({
    kind: "session-cookie",
    value: "%E0%A4%A",
  });
});

test("a request with neither is no credential", () => {
  expect(credentialOf({})).toBeNull();
  expect(credentialOf({ cookie: "session=cookie; theme=dark" })).toBeNull();
  expect(credentialOf({ authorization: "Bearer" })).toBeNull();
});
