import { expect, test } from "vitest";

import { describeCapabilities } from "example-shared/formatting/describeCapabilities";
import { AUTH0_PROVIDER } from "example-shared/providers/constants/auth0Provider";
import { BETTER_AUTH_PROVIDER } from "example-shared/providers/constants/betterAuthProvider";

test("a provider's capabilities read as the phrases Harbor's status bar lists", () => {
  expect(describeCapabilities(AUTH0_PROVIDER)).toEqual([
    "emits nothing, so Anchor reads again",
    "mints access tokens",
    "organizations",
    "a logout page",
  ]);
  expect(describeCapabilities(BETTER_AUTH_PROVIDER)).toEqual([
    "pushes every change",
    "a cookie session, no tokens",
    "organizations",
    "no logout page",
  ]);
});
