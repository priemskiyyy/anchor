import { afterEach, expect, test, vi } from "vitest";

import {
  createFakeServerAdapter,
  requestWithCookie,
} from "src/fakeServerAdapter.fixture";
import { getRequestSession } from "src/getRequestSession";

afterEach(() => {
  vi.useRealTimers();
});

test("a request without the provider's cookie is signed out, with no header to set", async () => {
  const fake = createFakeServerAdapter();

  const { state, headers } = await getRequestSession(requestWithCookie(null), {
    adapter: fake.adapter,
  });

  expect(state).toEqual({ status: "signed-out" });
  expect([...headers]).toEqual([]);
});

test("a request with a session is signed in as its principal, with a frozen user and nothing of a client session", async () => {
  const fake = createFakeServerAdapter();

  fake.signIn("cookie_ada", "ada");

  const result = await getRequestSession(requestWithCookie("cookie_ada"), {
    adapter: fake.adapter,
  });

  const { state } = result;

  expect(Object.isFrozen(result)).toBe(true);

  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  expect(state.session).toEqual({
    principal: {
      authority: "https://auth.example.com",
      subject: "ada",
      tenant: null,
    },
    user: { id: "ada", name: "ADA" },
    guest: false,
    impersonated: false,
  });
  expect(Object.isFrozen(state)).toBe(true);
  expect(Object.isFrozen(state.session)).toBe(true);
  expect(Object.isFrozen(state.session.user)).toBe(true);
});

test("the headers the provider wants set, such as a refreshed cookie, are answered for the response", async () => {
  const fake = createFakeServerAdapter();

  fake.signIn("cookie_ada", "ada");

  const { headers } = await getRequestSession(requestWithCookie("cookie_ada"), {
    adapter: fake.adapter,
  });

  expect(headers.getSetCookie()).toEqual([
    "session=cookie_ada; Path=/; HttpOnly; Max-Age=604800",
  ]);
});

test("the adapter reads the request's URL, method and own headers, with the response's headers and a signal", async () => {
  const fake = createFakeServerAdapter();
  const request = requestWithCookie("cookie_ada");
  const read = vi.spyOn(fake.adapter, "read");

  await getRequestSession(request, { adapter: fake.adapter });

  expect(read).toHaveBeenCalledWith({
    url: "https://app.example.com/projects",
    method: "GET",
    headers: request.headers,
    responseHeaders: expect.any(Headers),
    signal: expect.any(AbortSignal),
  });
});

test("the headers a provider set before its read failed still reach the response, such as a rotated session cookie", async () => {
  const failure = new Error("The user could not be verified.");

  const { state, headers } = await getRequestSession(
    requestWithCookie("cookie_ada"),
    {
      adapter: {
        name: "rotating",
        native: null,
        read: ({ responseHeaders }) => {
          responseHeaders.append(
            "set-cookie",
            "session=cookie_rotated; Path=/; HttpOnly",
          );

          throw failure;
        },
      },
    },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
  expect(headers.getSetCookie()).toEqual([
    "session=cookie_rotated; Path=/; HttpOnly",
  ]);
});

test("a session with a step to finish requires its action", async () => {
  const { state } = await getRequestSession(requestWithCookie(null), {
    adapter: {
      name: "pending",
      native: null,
      read: () => ({
        status: "action-required",
        action: { kind: "accept-terms" },
        principal: {
          authority: "https://auth.example.com",
          subject: "ada",
          tenant: null,
        },
        user: null,
        context: null,
        guest: false,
        impersonated: false,
      }),
    },
  });

  expect(state).toMatchObject({
    status: "action-required",
    action: { kind: "accept-terms" },
    session: { principal: { subject: "ada" } },
  });
});

test("a read that fails is unavailable with READ_FAILED and its error as the cause, never signed out", async () => {
  const fake = createFakeServerAdapter();
  const failure = new Error("The database is unreachable.");

  fake.failures.read = failure;

  const { state, headers } = await getRequestSession(
    requestWithCookie("cookie_ada"),
    { adapter: fake.adapter },
  );

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "READ_FAILED", cause: failure },
  });
  expect([...headers]).toEqual([]);
});

test("an answer outside the contract is unavailable with INVALID_ANSWER", async () => {
  const { state } = await getRequestSession(requestWithCookie(null), {
    adapter: {
      name: "broken",
      native: null,
      read: () => JSON.parse('{ "status": "signed-in" }'),
    },
  });

  expect(state).toMatchObject({
    status: "unavailable",
    error: { code: "INVALID_ANSWER" },
  });
});

test("a read that outlives the timeout is unavailable with TIMEOUT, and its signal aborts", async () => {
  vi.useFakeTimers();

  const fake = createFakeServerAdapter();

  fake.holdReads();

  const reading = getRequestSession(requestWithCookie(null), {
    adapter: fake.adapter,
    timeout: 1_000,
  });

  await vi.advanceTimersByTimeAsync(1_000);

  expect((await reading).state).toMatchObject({
    status: "unavailable",
    error: { code: "TIMEOUT" },
  });
  expect(fake.held[0]?.request.signal.aborted).toBe(true);
});

test("a read that outlives its timeout cannot change the headers already answered", async () => {
  vi.useFakeTimers();

  const fake = createFakeServerAdapter();

  fake.signIn("cookie_ada", "ada");
  fake.holdReads();

  const reading = getRequestSession(requestWithCookie("cookie_ada"), {
    adapter: fake.adapter,
    timeout: 1_000,
  });

  await vi.advanceTimersByTimeAsync(1_000);

  const { headers } = await reading;

  fake.held[0]?.settle();

  expect(fake.held[0]?.request.responseHeaders.getSetCookie()).toEqual([
    "session=cookie_ada; Path=/; HttpOnly; Max-Age=604800",
  ]);
  expect([...headers]).toEqual([]);
});

test("an invalid timeout is refused with INVALID_CONFIGURATION before anything is read", async () => {
  const fake = createFakeServerAdapter();
  const read = vi.spyOn(fake.adapter, "read");

  await expect(
    getRequestSession(requestWithCookie(null), {
      adapter: fake.adapter,
      timeout: 0,
    }),
  ).rejects.toMatchObject({ code: "INVALID_CONFIGURATION" });
  expect(read).not.toHaveBeenCalled();
});

test("concurrent requests never see each other's session or headers, whatever order their reads settle in", async () => {
  const fake = createFakeServerAdapter();

  fake.signIn("cookie_ada", "ada");
  fake.signIn("cookie_grace", "grace");
  fake.holdReads();

  const ada = getRequestSession(requestWithCookie("cookie_ada"), {
    adapter: fake.adapter,
  });

  const grace = getRequestSession(requestWithCookie("cookie_grace"), {
    adapter: fake.adapter,
  });

  const anonymous = getRequestSession(requestWithCookie(null), {
    adapter: fake.adapter,
  });

  await Promise.resolve();
  fake.held[2]?.settle();
  fake.held[1]?.settle();
  fake.held[0]?.settle();

  const [adaResult, graceResult, anonymousResult] = await Promise.all([
    ada,
    grace,
    anonymous,
  ]);

  expect(adaResult.state).toMatchObject({
    session: { principal: { subject: "ada" } },
  });
  expect(adaResult.headers.getSetCookie()).toEqual([
    "session=cookie_ada; Path=/; HttpOnly; Max-Age=604800",
  ]);
  expect(graceResult.state).toMatchObject({
    session: { principal: { subject: "grace" } },
  });
  expect(graceResult.headers.getSetCookie()).toEqual([
    "session=cookie_grace; Path=/; HttpOnly; Max-Age=604800",
  ]);
  expect(anonymousResult.state).toEqual({ status: "signed-out" });
  expect([...anonymousResult.headers]).toEqual([]);
});
