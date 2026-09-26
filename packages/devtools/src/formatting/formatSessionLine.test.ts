import { expect, test } from "vitest";

import { formatSessionLine } from "src/formatting/formatSessionLine";

test("the header names the adapter, the session status and the generation, then the whole session key while there is one", () => {
  expect(
    formatSessionLine({
      adapter: { name: "firebase" },
      session: {
        status: "initializing",
        key: null,
        principal: null,
        generation: 0,
      },
    }),
  ).toBe("firebase · initializing · generation #0");
  expect(
    formatSessionLine({
      adapter: { name: "firebase" },
      session: {
        status: "signed-in",
        key: "5f0c1c9e-6b1e-4a53-9d0e-2f6a1d0c7b11",
        principal: {
          authority: "https://securetoken.google.com/my-project",
          subject: "uid_42",
          tenant: null,
        },
        generation: 3,
      },
    }),
  ).toBe(
    "firebase · signed-in · generation #3 · key 5f0c1c9e-6b1e-4a53-9d0e-2f6a1d0c7b11",
  );
});
