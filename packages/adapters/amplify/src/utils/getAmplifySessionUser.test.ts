import { expect, test } from "vitest";

import { getAmplifySessionUser } from "src/utils/getAmplifySessionUser";

test("the default user is getCurrentUser's user under Amplify's names", () => {
  expect(
    getAmplifySessionUser({
      username: "ada",
      userId: "7c1f-ada",
      signInDetails: {
        loginId: "ada@example.com",
        authFlowType: "USER_SRP_AUTH",
      },
    }),
  ).toEqual({
    username: "ada",
    userId: "7c1f-ada",
    signInDetails: {
      loginId: "ada@example.com",
      authFlowType: "USER_SRP_AUTH",
    },
  });
});

test("sign-in details the user lacks are null, as is each detail they lack", () => {
  expect(
    getAmplifySessionUser({ username: "ada", userId: "7c1f-ada" }),
  ).toEqual({ username: "ada", userId: "7c1f-ada", signInDetails: null });
  expect(
    getAmplifySessionUser({
      username: "ada",
      userId: "7c1f-ada",
      signInDetails: {},
    }).signInDetails,
  ).toEqual({ loginId: null, authFlowType: null });
});
