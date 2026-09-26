import { expect, test, vi } from "vitest";

import { handleAuthEvent } from "src/utils/handleAuthEvent";

test("signedOut is Amplify's own word that this device holds no session, so signed-out is pushed without a read", () => {
  const observer = { session: vi.fn(), invalidate: vi.fn() };

  handleAuthEvent(observer, { payload: { event: "signedOut" } });

  expect(observer.session.mock.calls).toEqual([[{ status: "signed-out" }]]);
  expect(observer.invalidate.mock.calls).toEqual([]);
});

test.each([
  "signedIn",
  "tokenRefresh",
  "tokenRefresh_failure",
  "signInWithRedirect",
  "signInWithRedirect_failure",
])("%s asks for a read", (event) => {
  const observer = { session: vi.fn(), invalidate: vi.fn() };

  handleAuthEvent(observer, { payload: { event } });

  expect(observer.session.mock.calls).toEqual([]);
  expect(observer.invalidate.mock.calls).toEqual([[]]);
});
