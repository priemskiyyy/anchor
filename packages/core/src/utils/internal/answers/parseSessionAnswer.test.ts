import { expect, test } from "vitest";

import type { SessionAnswer } from "src/types/SessionAnswer";
import { AnchorError } from "src/utils/AnchorError";
import { SIGNED_OUT_SESSION_STATE } from "src/utils/constants/states";
import { parseSessionAnswer } from "src/utils/internal/answers/parseSessionAnswer";

const principal = {
  authority: "https://securetoken.google.com/demo",
  subject: "ada",
  tenant: null,
};

const signedIn = {
  status: "signed-in",
  principal,
  user: { name: "Ada", roles: ["admin"] },
  context: null,
  guest: false,
  impersonated: false,
} satisfies SessionAnswer<{ name: string; roles: string[] }>;

const getFailure = (answer: unknown) => {
  try {
    // @ts-expect-error An adapter written in JavaScript can answer anything.
    parseSessionAnswer(answer);
  } catch (error) {
    return error;
  }

  return null;
};

test("a signed-out answer is the interned signed-out state", () => {
  expect(parseSessionAnswer({ status: "signed-out" })).toBe(
    SIGNED_OUT_SESSION_STATE,
  );
});

test("a signed-in answer is a frozen copy of its known fields, which later changes to the adapter's objects do not reach", () => {
  const user = { name: "Ada", roles: ["admin"] };

  const answered = { ...signedIn, user, token: "secret" };
  const answer = parseSessionAnswer(answered);

  user.roles.push("owner");

  expect(answer).toEqual({
    ...signedIn,
    user: { name: "Ada", roles: ["admin"] },
  });
  expect(Object.isFrozen(answer)).toBe(true);
  expect(
    answer.status === "signed-in" && Object.isFrozen(answer.principal),
  ).toBe(true);
  expect(answer.status === "signed-in" && Object.isFrozen(answer.user)).toBe(
    true,
  );
  expect(Object.hasOwn(answer, "token")).toBe(false);
});

test("an action-required answer keeps the provider's name for the step and nothing else", () => {
  const action = { kind: "choose-organization", url: "/choose" };

  expect(
    parseSessionAnswer({ ...signedIn, status: "action-required", action }),
  ).toEqual({
    ...signedIn,
    status: "action-required",
    action: { kind: "choose-organization" },
  });
});

test.each([
  ["nothing", undefined, "The adapter answered without a session."],
  [
    "an unknown status",
    { ...signedIn, status: "pending" },
    "The adapter answered a session status its contract does not allow.",
  ],
  [
    "no principal",
    { ...signedIn, principal: null },
    "The adapter answered a session without a principal.",
  ],
  [
    "an empty subject",
    { ...signedIn, principal: { ...principal, subject: "" } },
    "The adapter answered a principal without a subject.",
  ],
  [
    "a context that is a number",
    { ...signedIn, context: 7 },
    "The adapter answered a context that is neither a string nor null.",
  ],
  [
    "no guest flag",
    { ...signedIn, guest: undefined },
    "The adapter answered a session without its guest and impersonated flags.",
  ],
  [
    "no impersonated flag",
    { ...signedIn, impersonated: "no" },
    "The adapter answered a session without its guest and impersonated flags.",
  ],
  [
    "no action",
    { ...signedIn, status: "action-required" },
    "The adapter answered a required action without the action.",
  ],
  [
    "an action without its kind",
    { ...signedIn, status: "action-required", action: { kind: "" } },
    "The adapter answered a required action without its kind.",
  ],
])("an answer with %s is refused as INVALID_ANSWER", (_, answer, message) => {
  const failure = getFailure(answer);

  expect(failure).toBeInstanceOf(AnchorError);
  expect(failure).toMatchObject({ code: "INVALID_ANSWER", message });
});

test("a user that contains itself is refused, with the copy failure as the cause", () => {
  const user: { self?: unknown } = {};

  user.self = user;

  const failure = getFailure({ ...signedIn, user });

  expect(failure).toMatchObject({
    code: "INVALID_ANSWER",
    message: "The adapter answered a user that cannot be copied.",
    cause: new TypeError("A value that contains itself cannot be copied."),
  });
});

test("an answer whose fields throw when read is refused, never thrown through", () => {
  const thrown = new Error("getter exploded");

  const answer = {
    ...signedIn,
    get guest() {
      throw thrown;
    },
  };

  expect(getFailure(answer)).toMatchObject({
    code: "INVALID_ANSWER",
    message: "The adapter's answer could not be read.",
    cause: thrown,
  });
});
