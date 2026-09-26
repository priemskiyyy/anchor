import { expect, test } from "vitest";

import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("a Supabase user is signed in as its id under the supabase authority, a guest only when anonymous", () => {
  expect(
    getSessionAnswer({ id: "user_ada", is_anonymous: false }, ({ id }) => ({
      id,
    })),
  ).toEqual({
    status: "signed-in",
    principal: { authority: "supabase", subject: "user_ada", tenant: null },
    user: { id: "user_ada" },
    context: null,
    guest: false,
    impersonated: false,
  });
  expect(
    getSessionAnswer({ id: "user_guest", is_anonymous: true }, ({ id }) => id),
  ).toMatchObject({ guest: true });
  expect(getSessionAnswer({ id: "user_ada" }, ({ id }) => id)).toMatchObject({
    guest: false,
  });
});
