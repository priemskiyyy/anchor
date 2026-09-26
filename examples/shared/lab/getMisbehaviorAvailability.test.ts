import { expect, test } from "vitest";

import { MISBEHAVIORS } from "example-shared/lab/constants/misbehaviors";
import { getMisbehaviorAvailability } from "example-shared/lab/getMisbehaviorAvailability";
import { AUTH0_PROVIDER } from "example-shared/providers/constants/auth0Provider";
import { HTTP_PROVIDER } from "example-shared/providers/constants/httpProvider";

const getMisbehavior = (id: string) => {
  const found = MISBEHAVIORS.find((misbehavior) => misbehavior.id === id);

  if (found === undefined) {
    throw new Error(`No misbehavior named ${id}.`);
  }

  return found;
};

test("the provider's own reason comes first, then what the session must be for the misbehavior to make sense", () => {
  expect(
    getMisbehaviorAvailability(
      getMisbehavior("duplicate-event"),
      AUTH0_PROVIDER,
      "signed-in",
    ),
  ).toEqual({
    available: false,
    reason:
      "auth0-spa-js emits no events: Anchor learns a change on its next read, so there is no event to repeat.",
  });
  expect(
    getMisbehaviorAvailability(
      getMisbehavior("two-factor"),
      HTTP_PROVIDER,
      "signed-out",
    ),
  ).toEqual({
    available: false,
    reason: "Sign in first: this needs a session.",
  });
  expect(
    getMisbehaviorAvailability(
      getMisbehavior("two-factor"),
      HTTP_PROVIDER,
      "action-required",
    ),
  ).toEqual({
    available: false,
    reason: "Finish setting up two-factor first: the session is blocked.",
  });
  expect(
    getMisbehaviorAvailability(
      getMisbehavior("server-end"),
      HTTP_PROVIDER,
      "action-required",
    ),
  ).toEqual({ available: true });
  expect(
    getMisbehaviorAvailability(
      getMisbehavior("offline"),
      HTTP_PROVIDER,
      "unavailable",
    ),
  ).toEqual({ available: true });
});
