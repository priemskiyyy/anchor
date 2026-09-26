import { afterEach, expect, test, vi } from "vitest";

import type { EndResult } from "src/types/EndResult";
import { AnchorError } from "src/utils/AnchorError";
import { NOT_APPLICABLE_END_RESULT } from "src/utils/constants/end";
import {
  createRecord,
  getTypes,
  identity,
  token,
} from "src/utils/internal/sessions/createRecord.fixture";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const replaced = new AnchorError({
  code: "SESSION_CHANGED",
  message: "The session was replaced.",
});

const disposed = new AnchorError({
  code: "DISPOSED",
  message: "The Anchor was disposed.",
});

afterEach(() => {
  vi.useRealTimers();
});

test("a token is minted for the record's session identity and handed over as a frozen copy of its fields", async () => {
  const { record, tokens, events } = createRecord();
  const waiting = record.getToken("api");

  expect(tokens.map(({ request }) => request)).toEqual([
    {
      profile: "api",
      forceRefresh: false,
      session: identity,
      signal: expect.any(AbortSignal),
    },
  ]);

  const answered = { ...token, refresh: "eyJ.refresh" };

  tokens[0]?.settle(answered);

  const received = await waiting;

  expect(received).toEqual(token);
  expect(Object.isFrozen(received)).toBe(true);
  expect(getTypes(events)).toEqual(["token requested", "token received"]);
  expect(events.map(({ session, context }) => [session, context])).toEqual([
    [{ key: "key-1" }, { profile: "api", forceRefresh: false }],
    [{ key: "key-1" }, { profile: "api", forceRefresh: false }],
  ]);
});

test("callers of one profile and refresh mode share one adapter call, and a forced request never shares with a normal one", async () => {
  const { record, tokens, events } = createRecord();
  const first = record.getToken("api");
  const second = record.getToken("api");
  const forced = record.getToken("api", { forceRefresh: true });
  const forcedAgain = record.getToken("api", { forceRefresh: true });
  const reports = record.getToken("reports");

  expect(
    tokens.map(({ request }) => [request.profile, request.forceRefresh]),
  ).toEqual([
    ["api", false],
    ["api", true],
    ["reports", false],
  ]);

  const fresh = { ...token, value: "eyJ.fresh" };
  const report = { ...token, value: "eyJ.report" };

  tokens[0]?.settle(token);
  tokens[1]?.settle(fresh);
  tokens[2]?.settle(report);

  await expect(first).resolves.toEqual(token);
  await expect(second).resolves.toEqual(token);
  await expect(forced).resolves.toEqual(fresh);
  await expect(forcedAgain).resolves.toEqual(fresh);
  await expect(reports).resolves.toEqual(report);
  expect(getTypes(events).filter((type) => type === "token joined")).toEqual([
    "token joined",
    "token joined",
  ]);
});

test("a caller that aborts leaves alone, and when the last one leaves the adapter's signal aborts and the next call starts afresh", async () => {
  const { record, tokens } = createRecord();
  const leaving = new AbortController();
  const lastToLeave = new AbortController();
  const left = record.getToken("api", { signal: leaving.signal });
  const staying = record.getToken("api", { signal: lastToLeave.signal });

  leaving.abort();

  await expect(left).rejects.toMatchObject({ code: "ABORTED" });
  expect(tokens[0]?.request.signal.aborted).toBe(false);

  lastToLeave.abort();

  await expect(staying).rejects.toMatchObject({ code: "ABORTED" });
  expect(tokens[0]?.request.signal.aborted).toBe(true);

  const next = record.getToken("api");

  expect(tokens).toHaveLength(2);

  tokens[0]?.settle({ ...token, value: "eyJ.late" });
  tokens[1]?.settle(token);

  await expect(next).resolves.toEqual(token);
});

test("an already aborted signal is refused with ABORTED before the adapter is called", async () => {
  const { record, tokens } = createRecord();
  const controller = new AbortController();

  controller.abort();

  await expect(
    record.getToken("api", { signal: controller.signal }),
  ).rejects.toMatchObject({ code: "ABORTED" });
  expect(tokens).toEqual([]);
});

test("an undeclared profile is refused with INVALID_CONFIGURATION, and an adapter without getToken with UNSUPPORTED", async () => {
  const declared = createRecord();
  const tokenless = createRecord({ getToken: false });

  // @ts-expect-error The adapter declares only api and reports.
  await expect(declared.record.getToken("billing")).rejects.toMatchObject({
    code: "INVALID_CONFIGURATION",
    message: 'The adapter declares no token profile named "billing".',
  });
  await expect(tokenless.record.getToken("api")).rejects.toMatchObject({
    code: "UNSUPPORTED",
    message: "The adapter cannot mint tokens.",
  });
  expect(declared.tokens).toEqual([]);
});

test("while the provider blocks the session, tokens are refused with ACTION_REQUIRED before the call and when it lands", async () => {
  const { record, tokens, status, events } = createRecord();
  const pending = record.getToken("api");

  status.blocked = true;
  tokens[0]?.settle(token);

  await expect(pending).rejects.toMatchObject({ code: "ACTION_REQUIRED" });
  await expect(record.getToken("api")).rejects.toMatchObject({
    code: "ACTION_REQUIRED",
  });
  expect(tokens).toHaveLength(1);
  expect(events.at(-1)).toMatchObject({
    type: "token discarded",
    context: { profile: "api", forceRefresh: false, code: "ACTION_REQUIRED" },
  });
});

test("closing rejects every pending caller at once with the closing error and aborts the adapter's signal; a late token is discarded", async () => {
  const { record, tokens, events } = createRecord();
  const first = record.getToken("api");
  const second = record.getToken("reports");

  record.close(replaced);

  await expect(first).rejects.toBe(replaced);
  await expect(second).rejects.toBe(replaced);
  expect(tokens.map(({ request }) => request.signal.aborted)).toEqual([
    true,
    true,
  ]);
  expect(record.operations()).toEqual([]);

  tokens[0]?.settle(token);
  await flush();

  expect(events.at(-1)).toMatchObject({
    type: "token discarded",
    context: { profile: "api", code: "SESSION_CHANGED" },
  });
});

test("after closing, a token request is refused with the closing error and calls nothing", async () => {
  const { record, tokens } = createRecord();

  record.close(disposed);
  record.close(replaced);

  await expect(record.getToken("api")).rejects.toBe(disposed);
  expect(tokens).toEqual([]);
});

test("an adapter's SESSION_CHANGED passes through, and any other failure becomes TOKEN_FAILED with its cause", async () => {
  const { record, tokens, events } = createRecord();
  const switched = record.getToken("api");
  const offline = record.getToken("reports");

  const changed = new AnchorError({
    code: "SESSION_CHANGED",
    message: "The SDK holds another user.",
  });

  const network = new TypeError("fetch failed");

  tokens[0]?.fail(changed);
  tokens[1]?.fail(network);

  await expect(switched).rejects.toBe(changed);
  await expect(offline).rejects.toMatchObject({
    code: "TOKEN_FAILED",
    message: "The adapter could not mint the token.",
    cause: network,
  });
  expect(
    events.flatMap(({ type, context }) =>
      type === "token failed" ? [context] : [],
    ),
  ).toEqual([
    { profile: "api", forceRefresh: false, code: "SESSION_CHANGED" },
    { profile: "reports", forceRefresh: false, code: "TOKEN_FAILED" },
  ]);
});

test("a token outside the contract is refused as INVALID_ANSWER", async () => {
  const { record, tokens, events } = createRecord();
  const waiting = record.getToken("api");

  tokens[0]?.settle({ ...token, value: "" });

  await expect(waiting).rejects.toMatchObject({ code: "INVALID_ANSWER" });
  expect(events.at(-1)).toMatchObject({
    type: "answer invalid",
    context: { operation: "token" },
  });
});

test("a token request that outlives the timeout rejects with TIMEOUT and aborts the adapter's signal", async () => {
  vi.useFakeTimers();

  const { record, tokens } = createRecord({ timeout: 300 });
  const waiting = record.getToken("api");

  vi.advanceTimersByTime(300);

  await expect(waiting).rejects.toMatchObject({ code: "TIMEOUT" });
  expect(tokens[0]?.request.signal.aborted).toBe(true);
});

test("ending calls the adapter with the identity, a second end joins it, and tokens pending or new are refused while it runs", async () => {
  const { record, tokens, ends } = createRecord();
  const pending = record.getToken("api");
  const ending = record.end();

  expect(record.end()).toBe(ending);
  expect(ends.map(({ request }) => request)).toEqual([
    { session: identity, signal: expect.any(AbortSignal) },
  ]);

  await expect(pending).rejects.toMatchObject({
    code: "SESSION_CHANGED",
    message: "The session is ending.",
  });
  await expect(record.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
    message: "The session is ending.",
  });
  expect(tokens[0]?.request.signal.aborted).toBe(true);
  expect(record.operations()).toEqual([
    { kind: "end", session: { key: "key-1" } },
  ]);
});

test("an end whose local step completed hands its result to the runtime and keeps refusing tokens", async () => {
  const { record, ends, onEnded, events } = createRecord();
  const ending = record.end();

  const result: EndResult = {
    local: "completed",
    remote: "completed",
    navigation: null,
  };

  ends[0]?.settle(result);

  await expect(ending).resolves.toEqual(result);
  expect(onEnded.mock.calls).toEqual([[result]]);
  await expect(record.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(getTypes(events)).toEqual(["end started", "end completed"]);
  expect(events.at(-1)?.context).toEqual({
    local: "completed",
    remote: "completed",
  });
});

test("an end whose local step did not complete reopens the session and hands its result to the runtime", async () => {
  const { record, ends, tokens, onEnded } = createRecord();
  const ending = record.end();

  ends[0]?.settle({ local: "unknown", remote: "completed", navigation: null });

  await expect(ending).resolves.toEqual({
    local: "unknown",
    remote: "completed",
    navigation: null,
  });
  expect(onEnded.mock.calls).toEqual([
    [{ local: "unknown", remote: "completed", navigation: null }],
  ]);

  const waiting = record.getToken("api");

  tokens[0]?.settle(token);

  await expect(waiting).resolves.toEqual(token);
});

test("a failed end reopens the session, rejects END_FAILED with the cause and asks the runtime to reconcile", async () => {
  const { record, ends, onEnded, events } = createRecord();
  const ending = record.end();
  const network = new TypeError("fetch failed");

  ends[0]?.fail(network);

  await expect(ending).rejects.toMatchObject({
    code: "END_FAILED",
    message: "The adapter could not end the session.",
    cause: network,
  });
  expect(onEnded.mock.calls).toEqual([[null]]);
  expect(record.operations()).toEqual([]);
  expect(events.at(-1)).toMatchObject({
    type: "end failed",
    context: { code: "END_FAILED" },
  });
});

test("an ending outside the contract is INVALID_ANSWER and reopens the session", async () => {
  const { record, ends, onEnded } = createRecord();
  const ending = record.end();

  ends[0]?.settle({
    local: "completed",
    remote: "completed",
    navigation: { url: "" },
  });

  await expect(ending).rejects.toMatchObject({ code: "INVALID_ANSWER" });
  expect(onEnded.mock.calls).toEqual([[null]]);
});

test("an end that outlives the timeout rejects with TIMEOUT, aborts the adapter's signal and reopens the session", async () => {
  vi.useFakeTimers();

  const { record, ends, onEnded, events } = createRecord({ timeout: 300 });
  const ending = record.end();

  vi.advanceTimersByTime(300);

  await expect(ending).rejects.toMatchObject({ code: "TIMEOUT" });
  expect(ends[0]?.request.signal.aborted).toBe(true);
  expect(onEnded.mock.calls).toEqual([[null]]);

  ends[0]?.settle({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  await Promise.resolve();
  await Promise.resolve();

  expect(onEnded.mock.calls).toEqual([[null]]);
  expect(getTypes(events)).toEqual(["end started", "end failed"]);
});

test("an ending that fails after its session was replaced leaves the session closed and the runtime untouched", async () => {
  const { record, ends, onEnded, tokens } = createRecord();
  const ending = record.end();

  record.close(replaced);
  ends[0]?.fail(new TypeError("fetch failed"));

  await expect(ending).rejects.toMatchObject({ code: "END_FAILED" });
  await expect(record.getToken("api")).rejects.toBe(replaced);
  expect(onEnded.mock.calls).toEqual([]);
  expect(tokens).toEqual([]);
});

test("a session replaced while ending aborts the adapter's signal, and the late answer resolves its caller without touching the runtime", async () => {
  const { record, ends, onEnded } = createRecord();
  const ending = record.end();

  record.close(replaced);

  expect(ends[0]?.request.signal.aborted).toBe(true);

  ends[0]?.settle({
    local: "not-applicable",
    remote: "unknown",
    navigation: null,
  });

  await expect(ending).resolves.toEqual({
    local: "not-applicable",
    remote: "unknown",
    navigation: null,
  });
  expect(onEnded.mock.calls).toEqual([]);
});

test("disposal while ending rejects the caller at once with DISPOSED", async () => {
  const { record, ends, onEnded } = createRecord();
  const ending = record.end();

  record.close(disposed);

  await expect(ending).rejects.toBe(disposed);
  expect(ends[0]?.request.signal.aborted).toBe(true);

  ends[0]?.settle({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  await flush();

  expect(onEnded.mock.calls).toEqual([]);
});

test("ending a replaced session answers not-applicable without calling the adapter, and a disposed one rejects", async () => {
  const replacedRecord = createRecord();
  const disposedRecord = createRecord();

  replacedRecord.record.close(replaced);
  disposedRecord.status.disposed = true;
  disposedRecord.record.close(disposed);

  await expect(replacedRecord.record.end()).resolves.toBe(
    NOT_APPLICABLE_END_RESULT,
  );
  await expect(disposedRecord.record.end()).rejects.toMatchObject({
    code: "DISPOSED",
  });
  expect([...replacedRecord.ends, ...disposedRecord.ends]).toEqual([]);
});

test("an ending still running on a replaced session keeps running, until dispose rejects it and the adapter's late answer changes nothing", async () => {
  const { record, ends, status } = createRecord();
  const ending = record.end();

  record.close(replaced);

  expect(record.isEnding()).toBe(true);
  expect(ends[0]?.request.signal.aborted).toBe(true);

  status.disposed = true;
  record.close(disposed);

  await expect(ending).rejects.toBe(disposed);
  expect(record.isEnding()).toBe(false);

  ends[0]?.settle({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  await Promise.resolve();

  await expect(ending).rejects.toBe(disposed);
});

test("an adapter without end is UNSUPPORTED", async () => {
  const { record } = createRecord({ end: false });

  await expect(record.end()).rejects.toMatchObject({
    code: "UNSUPPORTED",
    message: "The adapter cannot end a session.",
  });
});

test("operations list each pending token request with its waiters", () => {
  const { record } = createRecord();
  const signal = new AbortController().signal;

  record.getToken("api", { signal }).catch(() => {});
  record.getToken("api").catch(() => {});
  record.getToken("reports", { forceRefresh: true }).catch(() => {});

  expect(record.operations()).toEqual([
    {
      kind: "token",
      session: { key: "key-1" },
      profile: "api",
      forceRefresh: false,
      waiters: 2,
    },
    {
      kind: "token",
      session: { key: "key-1" },
      profile: "reports",
      forceRefresh: true,
      waiters: 1,
    },
  ]);
});

test("a rejection that lands after the ending timed out records nothing more", async () => {
  vi.useFakeTimers();

  const { record, ends, events } = createRecord({ timeout: 300 });
  const ending = record.end();

  vi.advanceTimersByTime(300);
  await expect(ending).rejects.toMatchObject({ code: "TIMEOUT" });

  ends[0]?.fail(new TypeError("fetch failed"));
  await Promise.resolve();
  await Promise.resolve();

  expect(getTypes(events)).toEqual(["end started", "end failed"]);
});
