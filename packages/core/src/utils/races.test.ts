import { expect, test } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorSession } from "src/types/AnchorSession";
import type { SessionObserver } from "src/types/SessionObserver";
import { Anchor } from "src/utils/Anchor";
import { signedIn, signedOut, tick } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

type Held = { read?: boolean; getToken?: boolean; end?: boolean };

const create = (hold: Held) => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold,
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  return { mock, anchor };
};

const getSignedInSession = (
  anchor: Anchor<User, unknown, "api">,
): AnchorSession<User, "api"> => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error(`Expected a signed-in session, got ${state.status}.`);
  }

  return state.session;
};

test("invariant 1: a first read that lands after a newer push cannot restore the older session", async () => {
  const { mock, anchor } = create({ read: true });
  const started = anchor.start();

  mock.push(signedOut);
  mock.reads[0]?.settle(signedIn("ada"));
  await started;
  await tick();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });
});

test("invariant 2: a token requested for A that lands after B was accepted rejects SESSION_CHANGED", async () => {
  const { mock, anchor } = create({ getToken: true });

  await anchor.start();

  const token = getSignedInSession(anchor).getToken("api");

  mock.push(signedIn("grace"));
  mock.tokens[0]?.settle({
    value: "token-for-ada",
    kind: "access-token",
    scheme: "Bearer",
  });

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(mock.tokens[0]?.request.signal.aborted).toBe(true);
});

test("invariant 3: a token asked for A after the SDK switched to B, before Anchor saw it, is refused because the request names A", async () => {
  const { mock, anchor } = create({});

  await anchor.start();

  const ada = getSignedInSession(anchor);

  mock.change(signedIn("grace"));

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  expect(mock.tokens[0]?.request.session.principal.subject).toBe("ada");
});

test("invariant 4: the same subject in a new organization gets a new key, and its pending token rejects", async () => {
  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada", { context: "org_1" }),
    tokens: { api: {} },
    hold: { getToken: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  const first = getSignedInSession(anchor);
  const token = first.getToken("api");

  mock.push(signedIn("ada", { context: "org_2" }));

  await expect(token).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(getSignedInSession(anchor).key).not.toBe(first.key);
});

test("invariant 5: callbacks from a start that failed, and from before dispose, change nothing", async () => {
  const observers: SessionObserver<User>[] = [];
  let failing = true;

  const mock = createMockAdapter<User>({
    answer: signedIn("ada"),
    onOpen: (observer) => {
      observers.push(observer);

      if (!failing) {
        return;
      }

      throw new Error("not initialized");
    },
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  await expect(anchor.start()).rejects.toMatchObject({ code: "START_FAILED" });

  failing = false;
  await anchor.start();
  observers[0]?.session(signedOut);

  expect(anchor.session.get().status).toBe("signed-in");

  anchor.dispose();
  observers[1]?.session(signedOut);
  observers[1]?.invalidate();

  expect(anchor.session.get().status).toBe("signed-in");
  expect(mock.reads).toHaveLength(1);
});

test("invariant 6: reentrant pushes order by revision, the newest wins, and no subscriber sees an older state after a newer one", async () => {
  const { mock, anchor } = create({});

  await anchor.start();

  const seen: string[][] = [[], []];

  anchor.session.subscribe(() => {
    const state = anchor.session.get();

    seen[0]?.push(
      state.status === "signed-in"
        ? state.session.principal.subject
        : state.status,
    );

    if (
      state.status !== "signed-in" ||
      state.session.principal.subject !== "grace"
    ) {
      return;
    }

    mock.push(signedIn("linus"));
  });
  anchor.session.subscribe(() => {
    const state = anchor.session.get();

    seen[1]?.push(
      state.status === "signed-in"
        ? state.session.principal.subject
        : state.status,
    );
  });
  mock.push(signedIn("grace"));

  expect(getSignedInSession(anchor).principal.subject).toBe("linus");
  expect(seen).toEqual([["grace", "linus"], ["linus"]]);
});

test("invariant 7: an end for A that lands after B was accepted changes nothing for B, and its signal aborted", async () => {
  const { mock, anchor } = create({ end: true });

  await anchor.start();

  const ending = getSignedInSession(anchor).end();

  mock.push(signedIn("grace"));

  expect(mock.ends[0]?.request.signal.aborted).toBe(true);

  mock.ends[0]?.settle({
    local: "completed",
    remote: "completed",
    navigation: null,
  });

  await expect(ending).resolves.toEqual({
    local: "completed",
    remote: "completed",
    navigation: null,
  });
  expect(getSignedInSession(anchor).principal.subject).toBe("grace");
});

test("invariant 9: ignoring a stale answer undoes nothing the provider stored itself, and asks the provider for nothing more", async () => {
  const { mock, anchor } = create({ read: true });
  const started = anchor.start();

  mock.push(signedIn("grace"));
  mock.change(signedIn("ada"));
  mock.reads[0]?.settle(signedIn("ada"));
  await started;
  await tick();

  expect(getSignedInSession(anchor).principal.subject).toBe("grace");
  expect(mock.current()).toEqual(signedIn("ada"));
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
});

test("invariant 8: a stale reference to A's session can neither mint nor end anything for B", async () => {
  const { mock, anchor } = create({});

  await anchor.start();

  const ada = getSignedInSession(anchor);

  mock.push(signedIn("grace"));

  await expect(ada.getToken("api")).rejects.toMatchObject({
    code: "SESSION_CHANGED",
  });
  await expect(ada.end()).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });
  expect(mock.tokens).toEqual([]);
  expect(mock.ends).toEqual([]);
  expect(getSignedInSession(anchor).principal.subject).toBe("grace");
});
