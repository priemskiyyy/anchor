import { afterEach, expect, test, vi } from "vitest";

import { getCurrentSession } from "src/utils/getCurrentSession";

afterEach(() => {
  vi.unstubAllGlobals();
});

const answer = (body: unknown, status = 200) => {
  const fetch = vi.fn(async () => Response.json(body, { status }));

  vi.stubGlobal("fetch", fetch);

  return fetch;
};

test("the session endpoint's session is the current session, read from the basePath with a JSON request", async () => {
  const session = {
    user: { id: "user_ada", name: "Ada", email: "ada@example.com" },
    expires: "2026-10-24T00:00:00.000Z",
  };

  const fetch = answer(session);

  await expect(getCurrentSession("/api/auth")).resolves.toEqual(session);
  expect(fetch).toHaveBeenCalledWith("/api/auth/session", {
    headers: { "Content-Type": "application/json" },
  });
});

test("Auth.js 4's empty object and Auth.js 5's null are both no session", async () => {
  answer({});

  await expect(getCurrentSession("/api/auth")).resolves.toBe(null);

  answer(null);

  await expect(getCurrentSession("/api/auth")).resolves.toBe(null);
});

test("a status that is not OK and a network failure both throw, because neither says who is signed in", async () => {
  answer({ message: "Internal Server Error" }, 500);

  await expect(getCurrentSession("/api/auth")).rejects.toThrow(
    "Auth.js answered 500 for the session.",
  );

  const failure = new TypeError("Failed to fetch");

  vi.stubGlobal("fetch", async () => {
    throw failure;
  });

  await expect(getCurrentSession("/api/auth")).rejects.toBe(failure);
});
