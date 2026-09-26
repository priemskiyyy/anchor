import { expect, test } from "vitest";

import { parsePrincipal } from "src/utils/internal/answers/parsePrincipal";

test("a principal is a frozen copy of its authority, subject and tenant only", () => {
  const principal = parsePrincipal({
    authority: "https://login.example.com",
    subject: "ada",
    tenant: "acme",
    email: "ada@example.com",
  });

  expect(principal).toEqual({
    authority: "https://login.example.com",
    subject: "ada",
    tenant: "acme",
  });
  expect(Object.isFrozen(principal)).toBe(true);
});

test.each([
  ["nothing", null, "The adapter answered a session without a principal."],
  [
    "no authority",
    { subject: "ada", tenant: null },
    "The adapter answered a principal without an authority.",
  ],
  [
    "an empty subject",
    { authority: "https://login.example.com", subject: "", tenant: null },
    "The adapter answered a principal without a subject.",
  ],
  [
    "a missing tenant",
    { authority: "https://login.example.com", subject: "ada" },
    "The adapter answered a tenant that is neither a name nor null.",
  ],
  [
    "an empty tenant",
    { authority: "https://login.example.com", subject: "ada", tenant: "" },
    "The adapter answered a tenant that is neither a name nor null.",
  ],
])("a principal with %s is refused as INVALID_ANSWER", (_, value, message) => {
  expect(() => parsePrincipal(value)).toThrow(
    expect.objectContaining({ code: "INVALID_ANSWER", message }),
  );
});
