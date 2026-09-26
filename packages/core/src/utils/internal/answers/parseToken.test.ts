import { expect, test } from "vitest";

import { parseToken } from "src/utils/internal/answers/parseToken";

test("a token is a frozen copy of its value, kind and scheme, so nothing else an adapter attached is handed over", () => {
  const answered = {
    value: "eyJ.access",
    kind: "access-token",
    scheme: "Bearer",
    refresh: "eyJ.refresh",
  };

  const token = parseToken(answered);

  expect(token).toEqual({
    value: "eyJ.access",
    kind: "access-token",
    scheme: "Bearer",
  });
  expect(Object.isFrozen(token)).toBe(true);
  expect(
    parseToken({ value: "opaque", kind: "session-token", scheme: null }),
  ).toEqual({
    value: "opaque",
    kind: "session-token",
    scheme: null,
  });
});

test.each([
  ["nothing", null, "The adapter answered a token request without a token."],
  [
    "an empty value",
    { value: "", kind: "id-token", scheme: null },
    "The adapter answered a token without its value.",
  ],
  [
    "no kind",
    { value: "eyJ", scheme: null },
    "The adapter answered a token without its kind.",
  ],
  [
    "a missing scheme",
    { value: "eyJ", kind: "id-token" },
    "The adapter answered a token scheme that is neither a name nor null.",
  ],
  [
    "an empty scheme",
    { value: "eyJ", kind: "id-token", scheme: "" },
    "The adapter answered a token scheme that is neither a name nor null.",
  ],
])("a token with %s is refused as INVALID_ANSWER", (_, value, message) => {
  const read = () => {
    // @ts-expect-error An adapter written in JavaScript can answer anything.
    parseToken(value);
  };

  expect(read).toThrow(
    expect.objectContaining({ code: "INVALID_ANSWER", message }),
  );
});
