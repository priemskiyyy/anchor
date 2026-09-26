import fc from "fast-check";
import { expect, test } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { SessionAnswer } from "src/types/SessionAnswer";
import type { SessionState } from "src/types/SessionState";
import { Anchor } from "src/utils/Anchor";
import { assertUnreachable } from "src/utils/assertUnreachable.fixture";
import { actionRequired, signedIn, signedOut } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const ANSWERS: SessionAnswer<User>[] = [
  signedOut,
  signedIn("ada"),
  signedIn("ada", { context: "org_2" }),
  signedIn("ada", { user: { name: "Ada Lovelace" } }),
  signedIn("grace"),
  signedIn("grace", { guest: true }),
  actionRequired("ada", "setup-mfa"),
];

type Action =
  | { kind: "push"; answer: number }
  | { kind: "change"; answer: number }
  | { kind: "invalidate" }
  | { kind: "sync" }
  | { kind: "settle-read"; index: number; answer: number | null }
  | { kind: "fail-read"; index: number }
  | { kind: "get-token"; forceRefresh: boolean }
  | { kind: "settle-token"; index: number; honest: boolean }
  | { kind: "fail-token"; index: number }
  | { kind: "end" }
  | { kind: "settle-end"; index: number; completed: boolean }
  | { kind: "dispose" };

const answer = fc.nat({ max: ANSWERS.length - 1 });
const index = fc.nat({ max: 8 });

const action: fc.Arbitrary<Action> = fc.oneof(
  { weight: 4, arbitrary: fc.record({ kind: fc.constant("push"), answer }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("change"), answer }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("invalidate") }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("sync") }) },
  {
    weight: 4,
    arbitrary: fc.record({
      kind: fc.constant("settle-read"),
      index,
      answer: fc.option(answer, { nil: null }),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({ kind: fc.constant("fail-read"), index }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant("get-token"),
      forceRefresh: fc.boolean(),
    }),
  },
  {
    weight: 3,
    arbitrary: fc.record({
      kind: fc.constant("settle-token"),
      index,
      honest: fc.boolean(),
    }),
  },
  {
    weight: 1,
    arbitrary: fc.record({ kind: fc.constant("fail-token"), index }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("end") }) },
  {
    weight: 2,
    arbitrary: fc.record({
      kind: fc.constant("settle-end"),
      index,
      completed: fc.boolean(),
    }),
  },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("dispose") }) },
);

const getIdentity = (state: SessionState<User, "api">) => {
  if (state.status !== "signed-in" && state.status !== "action-required") {
    return null;
  }

  const { key, principal, guest, impersonated } = state.session;

  return {
    key,
    identity: JSON.stringify([principal.subject, guest, impersonated]),
  };
};

// Every call of the mock and the core settles through promises, so a bounded run of microtasks is quiescence.
const settle = async () => {
  for (let turn = 0; turn < 25; turn += 1) {
    await Promise.resolve();
  }
};

const run = async (actions: Action[], settleFirstRead: boolean) => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold: true,
  });

  const anchor = new Anchor({ adapter: mock.adapter });
  const identities = new Map<string, string>();
  const violations: string[] = [];
  const readStarts: number[] = [];
  const settledReads = new Set<number>();
  let step = 0;
  let lastObservation = -1;
  let resolved = false;
  let disposed: SessionState<User, "api"> | null = null;

  const check = () => {
    const state = anchor.session.get();

    if (state.status === "initializing" && resolved) {
      violations.push("the state went back to initializing");
    }

    if (state.status !== "initializing") {
      resolved = true;
    }

    if (disposed !== null && state !== disposed) {
      violations.push("the state changed after dispose");
    }

    const current = getIdentity(state);

    if (current === null) {
      return;
    }

    const known = identities.get(current.key);

    if (known !== undefined && known !== current.identity) {
      violations.push(`the key ${current.key} belonged to two identities`);
    }

    identities.set(current.key, current.identity);
  };

  anchor.session.subscribe(check);
  anchor.start().catch(() => {});

  const pick = <TCall>(calls: TCall[], at: number) =>
    calls[at % Math.max(calls.length, 1)];

  const noteReads = () => {
    while (readStarts.length < mock.reads.length) {
      readStarts.push(step);
    }
  };

  const settleRead = async (
    at: number,
    answer: SessionAnswer<User> | undefined,
  ) => {
    noteReads();

    const position = at % Math.max(mock.reads.length, 1);
    const read = mock.reads[position];

    if (read === undefined || settledReads.has(position)) {
      return;
    }

    const superseded = lastObservation > (readStarts[position] ?? 0);
    const before = anchor.session.get();

    settledReads.add(position);
    read.settle(answer);
    await settle();

    if (!superseded || anchor.session.get() === before) {
      return;
    }

    violations.push(
      `read ${position}, superseded by a newer observation, changed the state`,
    );
  };

  const requestSync = () => {
    noteReads();

    const firstEligible = mock.reads.length;

    anchor
      .sync()
      .then(() => {
        if ([...settledReads].some((position) => position >= firstEligible)) {
          return;
        }

        violations.push(
          "a sync resolved before a read that started after it settled",
        );
      })
      .catch(() => {});
  };

  const requestToken = (forceRefresh: boolean) => {
    const state = anchor.session.get();

    if (state.status !== "signed-in" && state.status !== "action-required") {
      return;
    }

    const { key, principal } = state.session;

    state.session
      .getToken("api", { forceRefresh })
      .then((token) => {
        const now = getIdentity(anchor.session.get());

        const checks: [failed: boolean, violation: string][] = [
          [
            anchor.session.get().status !== "signed-in",
            "a token resolved while its session was not signed in",
          ],
          [
            now === null || now.key !== key,
            `a token for ${key} resolved while another session was current`,
          ],
          [
            !token.value.startsWith(`api:${principal.subject}:`),
            `a token for ${principal.subject} named another subject: ${token.value}`,
          ],
        ];

        violations.push(
          ...checks.flatMap(([failed, violation]) =>
            failed ? [violation] : [],
          ),
        );
      })
      .catch(() => {});
  };

  const endSession = () => {
    const state = anchor.session.get();

    if (state.status !== "signed-in" && state.status !== "action-required") {
      return;
    }

    state.session.end().catch(() => {});
  };

  const stepNumber = () => step;

  const perform = (next: Action): Promise<void> | undefined => {
    if (next.kind === "push") {
      lastObservation = stepNumber();
      mock.push(ANSWERS[next.answer] ?? signedOut);

      return;
    }

    if (next.kind === "change") {
      mock.change(ANSWERS[next.answer] ?? signedOut);

      return;
    }

    if (next.kind === "invalidate") {
      mock.invalidate();

      return;
    }

    if (next.kind === "sync") {
      requestSync();

      return;
    }

    if (next.kind === "settle-read") {
      return settleRead(
        next.index,
        next.answer === null ? undefined : ANSWERS[next.answer],
      );
    }

    if (next.kind === "fail-read") {
      const position = next.index % Math.max(mock.reads.length, 1);

      if (!settledReads.has(position)) {
        settledReads.add(position);
        mock.reads[position]?.fail(new Error("offline"));
      }

      return;
    }

    if (next.kind === "get-token") {
      requestToken(next.forceRefresh);

      return;
    }

    if (next.kind === "settle-token") {
      const call = pick(mock.tokens, next.index);

      if (next.honest || call === undefined) {
        call?.settle();

        return;
      }

      call.settle({
        value: `api:${call.request.session.principal.subject}:held`,
        kind: "access-token",
        scheme: "Bearer",
      });

      return;
    }

    if (next.kind === "fail-token") {
      pick(mock.tokens, next.index)?.fail(new Error("offline"));

      return;
    }

    if (next.kind === "end") {
      endSession();

      return;
    }

    if (next.kind === "settle-end") {
      pick(mock.ends, next.index)?.settle(
        next.completed
          ? undefined
          : { local: "unknown", remote: "unknown", navigation: null },
      );

      return;
    }

    if (next.kind === "dispose") {
      if (disposed === null) {
        anchor.dispose();
        disposed = anchor.session.get();
      }

      return;
    }

    assertUnreachable(next);
  };

  noteReads();

  if (settleFirstRead) {
    await settleRead(0, undefined);
  }

  for (const action of actions) {
    step += 1;

    const before = anchor.session.get();

    await perform(action);
    noteReads();
    await settle();
    noteReads();

    if (action.kind === "settle-end" && anchor.session.get() !== before) {
      lastObservation = step;
    }

    check();
  }

  if (disposed === null) {
    for (let round = 0; round < 5; round += 1) {
      for (const position of mock.reads.keys()) {
        await settleRead(position, undefined);
      }

      for (const call of [...mock.tokens]) {
        call.settle();
      }

      for (const ending of [...mock.ends]) {
        ending.settle();
      }

      await settle();
    }

    const synced = anchor.sync();

    await settle();

    for (const position of mock.reads.keys()) {
      await settleRead(position, undefined);
    }

    await synced;
    await settle();

    const expected = mock.current();
    const state = anchor.session.get();

    if (expected.status !== state.status) {
      violations.push(
        `the provider holds ${expected.status} but the state is ${state.status}`,
      );
    }

    if (
      expected.status !== "signed-out" &&
      (state.status === "signed-in" || state.status === "action-required") &&
      state.session.principal.subject !== expected.principal.subject
    ) {
      violations.push(
        "the state names another subject than the provider holds",
      );
    }
  }

  anchor.dispose();

  return violations;
};

test("no interleaving of pushes, reads, syncs, tokens, ends and disposal breaks the commit rule or lets work cross sessions", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(action, { maxLength: 40 }),
      fc.boolean(),
      async (actions, settleFirstRead) => {
        expect(await run(actions, settleFirstRead)).toEqual([]);
      },
    ),
    // Seeded, so every run replays the same 300 interleavings and a failure reproduces.
    { numRuns: 300, seed: 20_260_925 },
  );
}, 60_000);
