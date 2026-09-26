import { expect, test } from "vitest";

import { createFakeSupabase } from "src/fakeSupabase.fixture";
import { getSessionAnswer } from "src/utils/getSessionAnswer";

test("no session is signed out", () => {
  expect(getSessionAnswer(null, (user) => user.id)).toEqual({
    status: "signed-out",
  });
});

test("a session is signed in as its user's id, a guest when the user is anonymous, with the mapped user", () => {
  const fake = createFakeSupabase();

  fake.signIn("ada", { anonymous: true });

  expect(getSessionAnswer(fake.current(), (user) => ({ id: user.id }))).toEqual(
    {
      status: "signed-in",
      principal: { authority: "supabase", subject: "ada", tenant: null },
      user: { id: "ada" },
      context: null,
      guest: true,
      impersonated: false,
    },
  );
});

test("a user without is_anonymous, as older sessions have, is not a guest", () => {
  const answer = getSessionAnswer(
    { access_token: "a", token_type: "bearer", user: { id: "ada" } },
    (user) => user,
  );

  expect(answer).toMatchObject({ guest: false });
});
