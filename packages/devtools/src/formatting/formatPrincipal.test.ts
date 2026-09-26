import { expect, test } from "vitest";

import { formatPrincipal } from "src/formatting/formatPrincipal";

test("a principal names its authority and subject, and its tenant when it has one", () => {
  expect(
    formatPrincipal({
      authority: "https://login.example.com",
      subject: "ada",
      tenant: null,
    }),
  ).toBe("https://login.example.com · ada");
  expect(
    formatPrincipal({
      authority: "https://login.example.com",
      subject: "ada",
      tenant: "west",
    }),
  ).toBe("https://login.example.com · ada · tenant west");
});
