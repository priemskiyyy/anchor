import { AnchorError } from "@priemskiyyy/anchor";
import { expect, test } from "vitest";

import { getSessionHydration } from "src/getSessionHydration";
import type { RequestSession } from "src/types/RequestSession";

type User = { id: string; name: string; email: string };

const session: RequestSession<User> = {
  principal: {
    authority: "https://auth.example.com",
    subject: "ada",
    tenant: null,
  },
  user: { id: "ada", name: "Ada", email: "ada@example.com" },
  guest: false,
  impersonated: false,
};

const selectName = ({ user }: RequestSession<User>) => ({ name: user.name });

test("a signed-in hydration carries its status and exactly what select picks, frozen", () => {
  const hydration = getSessionHydration(
    { status: "signed-in", session },
    { select: selectName },
  );

  expect(hydration).toEqual({ status: "signed-in", user: { name: "Ada" } });
  expect(JSON.stringify(hydration)).toBe(
    '{"status":"signed-in","user":{"name":"Ada"}}',
  );
  expect(Object.isFrozen(hydration)).toBe(true);
});

test("an action-required hydration carries the action's kind and nothing else of it", () => {
  const action = {
    kind: "accept-terms",
    url: "https://auth.example.com/terms",
  };

  expect(
    getSessionHydration(
      { status: "action-required", action, session },
      { select: selectName },
    ),
  ).toEqual({
    status: "action-required",
    action: { kind: "accept-terms" },
    user: { name: "Ada" },
  });
});

test("an unavailable hydration carries no error, and a signed-out one nothing at all", () => {
  const error = new AnchorError({
    code: "READ_FAILED",
    message: "The database at 10.0.0.7 is unreachable.",
  });

  expect(
    getSessionHydration(
      { status: "unavailable", error },
      { select: selectName },
    ),
  ).toEqual({ status: "unavailable" });
  expect(
    getSessionHydration({ status: "signed-out" }, { select: selectName }),
  ).toEqual({ status: "signed-out" });
});
