import { expect, test } from "vitest";

import { createFakeFirebaseAuth } from "src/fakeFirebaseAuth.fixture";
import { getTokenIssuer } from "src/utils/getTokenIssuer";

test("the authority is the issuer of the project's ID tokens", () => {
  expect(
    getTokenIssuer(createFakeFirebaseAuth({ projectId: "demo" }).sdk),
  ).toBe("https://securetoken.google.com/demo");
});

test("an app without a projectId is refused with INVALID_CONFIGURATION", () => {
  const { sdk } = createFakeFirebaseAuth({ projectId: "" });

  expect(() => getTokenIssuer(sdk)).toThrow(
    expect.objectContaining({ code: "INVALID_CONFIGURATION" }),
  );
  expect(() => getTokenIssuer({ ...sdk, app: { options: {} } })).toThrow(
    expect.objectContaining({ code: "INVALID_CONFIGURATION" }),
  );
});
