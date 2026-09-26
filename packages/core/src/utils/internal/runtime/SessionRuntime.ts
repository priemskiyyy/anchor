import type { AdapterSession } from "src/types/AdapterSession";
import type { AnchorSession } from "src/types/AnchorSession";
import type { DiagnosticOperation } from "src/types/DiagnosticOperation";
import type { EndResult } from "src/types/EndResult";
import type { Deferred } from "src/types/internal/Deferred";
import type { DiagnosticRecord } from "src/types/internal/DiagnosticRecord";
import type { IdentifiedAnswer } from "src/types/internal/IdentifiedAnswer";
import type { SessionAdapter } from "src/types/SessionAdapter";
import type { SessionAnswer } from "src/types/SessionAnswer";
import type { SessionObserver } from "src/types/SessionObserver";
import type { SessionState } from "src/types/SessionState";
import type { SyncHint } from "src/types/SyncHint";
import type { SyncHintSession } from "src/types/SyncHintSession";
import type { SyncHintTarget } from "src/types/SyncHintTarget";
import { AnchorError } from "src/utils/AnchorError";
import { createDeferred } from "src/utils/common/createDeferred";
import { isStructurallyEqual } from "src/utils/common/isStructurallyEqual";
import { isolate } from "src/utils/common/isolate";
import type { ValueStore } from "src/utils/common/ValueStore";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";
import { SIGNED_OUT_SESSION_STATE } from "src/utils/constants/states";
import { getSecurityContextFingerprint } from "src/utils/internal/answers/getSecurityContextFingerprint";
import { parseSessionAnswer } from "src/utils/internal/answers/parseSessionAnswer";
import { getInvalidAnswerError } from "src/utils/internal/answers/getInvalidAnswerError";
import type { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { createDisposedError } from "src/utils/internal/runtime/createDisposedError";
import { createSessionKey } from "src/utils/internal/runtime/createSessionKey";
import { getAcceptedSession } from "src/utils/internal/runtime/getAcceptedSession";
import { getSyncHintSession } from "src/utils/internal/runtime/getSyncHintSession";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";
import { getOperationError } from "src/utils/internal/sessions/getOperationError";
import { SessionRecord } from "src/utils/internal/sessions/SessionRecord";

type Read = {
  revision: number;
  controller: AbortController;
  timer: ReturnType<typeof setTimeout> | null;
  waiters: Deferred<void>[];
  settled: boolean;
};

type ReadOutcome<TUser> =
  | { status: "answered"; answer: SessionAnswer<TUser> }
  | { status: "failed"; error: AnchorError };

type Phase<TUser, TProfile extends string> =
  | { phase: "OPENING" }
  | { phase: "OPEN"; session: AdapterSession<TUser, TProfile> }
  | { phase: "DISPOSED"; session: AdapterSession<TUser, TProfile> | null };

type SessionRuntimeOptions<TUser, TNative, TProfile extends string> = {
  adapter: SessionAdapter<TUser, TNative, TProfile>;
  timeout: number;
  hints: SyncHint[];
  store: ValueStore<SessionState<TUser, TProfile>>;
  diagnostics: Diagnostics;
};

const isSameSessionState = <TUser, TProfile extends string>(
  current: SessionState<TUser, TProfile>,
  next: SessionState<TUser, TProfile>,
) => {
  if (current.status === "signed-in" && next.status === "signed-in") {
    return (
      current.session.key === next.session.key &&
      isStructurallyEqual(current.session.user, next.session.user)
    );
  }

  if (
    current.status === "action-required" &&
    next.status === "action-required"
  ) {
    return (
      current.action.kind === next.action.kind &&
      current.session.key === next.session.key &&
      isStructurallyEqual(current.session.user, next.session.user)
    );
  }

  return false;
};

export class SessionRuntime<TUser, TNative, TProfile extends string> {
  #adapter: SessionAdapter<TUser, TNative, TProfile>;
  #timeout: number;
  #hints: SyncHint[];
  #hintRemovals: (() => void)[] = [];
  #store: ValueStore<SessionState<TUser, TProfile>>;
  #diagnostics: Diagnostics;
  #phase: Phase<TUser, TProfile> = { phase: "OPENING" };
  #revision = 0;
  #committed = 0;
  #pushedWhileOpening: {
    revision: number;
    answer: SessionAnswer<TUser>;
  } | null = null;
  #activeRead: Read | null = null;
  #nextReadWaiters: Deferred<void>[] | null = null;
  #record: SessionRecord<TUser, TProfile> | null = null;
  #replacedEndings = new Set<SessionRecord<TUser, TProfile>>();
  #hintSession: {
    state: SessionState<TUser, TProfile>;
    view: SyncHintSession;
  } | null = null;
  #fingerprint: string | null = null;
  #generation = 0;
  #resolved = false;
  #ready = createDeferred<void>();

  constructor({
    adapter,
    timeout,
    hints,
    store,
    diagnostics,
  }: SessionRuntimeOptions<TUser, TNative, TProfile>) {
    this.#adapter = adapter;
    this.#timeout = timeout;
    this.#hints = hints;
    this.#store = store;
    this.#diagnostics = diagnostics;
  }

  ready = this.#ready.promise;

  isResolved = () => this.#resolved;

  getGeneration = () => this.#generation;

  open = () => {
    const target: SyncHintTarget = {
      sync: () => this.#handleInvalidate("sync hint"),
      session: {
        get: () => this.#getHintSession(),
        subscribe: this.#store.subscribe,
      },
    };

    // Hints install before the adapter opens, so a hint that throws leaves no provider listener behind.
    for (const hint of this.#hints) {
      try {
        this.#hintRemovals.push(hint(target));
      } catch (error) {
        throw this.#failStart("A sync hint could not install.", error);
      }
    }

    const observer: SessionObserver<TUser> = {
      session: (answer) => this.#handlePush(answer),
      invalidate: () => this.#handleInvalidate("invalidate"),
    };

    let session: AdapterSession<TUser, TProfile>;

    try {
      session = this.#adapter.open(observer);
    } catch (error) {
      throw this.#failStart("The adapter could not open.", error);
    }

    if (this.#phase.phase === "DISPOSED") {
      isolate(() => session.dispose?.());

      return;
    }

    this.#phase = { phase: "OPEN", session };
    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.ANCHOR_STARTED,
      session: null,
    });

    const opening = this.#pushedWhileOpening;
    const waiting = this.#nextReadWaiters ?? [];

    this.#pushedWhileOpening = null;
    this.#nextReadWaiters = null;

    // The first read starts before the buffered push commits, so a sync() from a subscriber of that commit waits behind it.
    this.#startRead(waiting);

    if (opening === null) {
      return;
    }

    this.#commitAnswer(opening.answer, opening.revision);
  };

  sync = (): Promise<void> => {
    if (this.#phase.phase === "DISPOSED") {
      return Promise.reject(createDisposedError());
    }

    const waiter = createDeferred<void>();

    this.#scheduleRead([waiter]);

    return waiter.promise;
  };

  dispose = () => {
    const phase = this.#phase;

    if (phase.phase === "DISPOSED") {
      return;
    }

    const session = phase.phase === "OPEN" ? phase.session : null;

    this.#phase = { phase: "DISPOSED", session };
    this.#removeHints();

    const disposed = createDisposedError();
    const read = this.#activeRead;
    const queued = this.#nextReadWaiters ?? [];

    this.#activeRead = null;
    this.#nextReadWaiters = null;

    if (read !== null) {
      this.#markReadSettled(read);
      read.controller.abort();
      queued.push(...read.waiters);
    }

    for (const waiter of queued) {
      waiter.reject(disposed);
    }

    this.#record?.close(disposed);

    for (const replaced of this.#replacedEndings) {
      replaced.close(disposed);
    }

    this.#replacedEndings.clear();
    this.#ready.reject(disposed);

    if (session === null) {
      return;
    }

    isolate(() => session.dispose?.());
  };

  operations = (): DiagnosticOperation[] => {
    const reads: DiagnosticOperation[] = [];

    if (this.#activeRead !== null) {
      reads.push({
        kind: "read",
        queued: false,
        waiters: this.#activeRead.waiters.length,
      });
    }

    if (this.#nextReadWaiters !== null) {
      reads.push({
        kind: "read",
        queued: true,
        waiters: this.#nextReadWaiters.length,
      });
    }

    return [...reads, ...(this.#record?.operations() ?? [])];
  };

  #handlePush(answer: SessionAnswer<TUser>) {
    if (this.#phase.phase === "DISPOSED") {
      this.#recordIgnoredCallback("session");

      return;
    }

    this.#revision += 1;

    const revision = this.#revision;
    const accepted = this.#parsePushedAnswer(answer);

    if (accepted === null) {
      return;
    }

    if (this.#phase.phase === "OPENING") {
      this.#pushedWhileOpening = { revision, answer: accepted };

      return;
    }

    this.#commitAnswer(accepted, revision);
  }

  #handleInvalidate(callback: "invalidate" | "sync hint") {
    if (this.#phase.phase === "DISPOSED") {
      this.#recordIgnoredCallback(callback);

      return;
    }

    if (this.#phase.phase === "OPENING") {
      return;
    }

    this.#scheduleRead([]);
  }

  #getHintSession() {
    const state = this.#store.get();
    const cached = this.#hintSession;

    // One view per state, so a hint that compares what it read sees a change only when there is one.
    if (cached !== null && cached.state === state) {
      return cached.view;
    }

    const view = getSyncHintSession(state);

    this.#hintSession = { state, view };

    return view;
  }

  #failStart(message: string, cause: unknown) {
    this.#removeHints();
    this.#phase = { phase: "DISPOSED", session: null };
    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.ANCHOR_START_FAILED,
      session: null,
      context: { code: "START_FAILED" },
    });

    const failure = new AnchorError({ code: "START_FAILED", message, cause });

    this.#ready.reject(failure);

    return failure;
  }

  #removeHints() {
    for (const remove of this.#hintRemovals) {
      isolate(remove);
    }
  }

  #parsePushedAnswer(answer: SessionAnswer<TUser>) {
    try {
      return parseSessionAnswer(answer);
    } catch {
      this.#recordEvent({
        type: DIAGNOSTIC_TYPES.ANSWER_INVALID,
        context: { operation: "push" },
      });

      return null;
    }
  }

  #scheduleRead(waiters: Deferred<void>[]) {
    // At most one read runs: while one runs, or while the adapter opens, the waiters wait for the next one.
    if (this.#phase.phase === "OPENING" || this.#activeRead !== null) {
      this.#nextReadWaiters = [...(this.#nextReadWaiters ?? []), ...waiters];
      this.#diagnostics.changed();

      return;
    }

    this.#startRead(waiters);
  }

  #startRead(waiters: Deferred<void>[]) {
    const phase = this.#phase;

    if (phase.phase !== "OPEN") {
      return;
    }

    const { session } = phase;

    this.#revision += 1;

    const read: Read = {
      revision: this.#revision,
      controller: new AbortController(),
      timer: null,
      waiters,
      settled: false,
    };

    read.timer = setTimeout(
      () =>
        this.#settleRead(read, {
          status: "failed",
          error: new AnchorError({
            code: "TIMEOUT",
            message: `The read took longer than ${this.#timeout} milliseconds.`,
          }),
        }),
      this.#timeout,
    );
    unrefTimer(read.timer);
    this.#activeRead = read;
    this.#recordEvent({ type: DIAGNOSTIC_TYPES.READ_STARTED });
    this.#diagnostics.changed();

    new Promise<SessionAnswer<TUser>>((resolve) =>
      resolve(session.read({ signal: read.controller.signal })),
    ).then(
      (answer) => this.#settleRead(read, this.#getReadOutcome(read, answer)),
      (error: unknown) =>
        this.#settleRead(read, {
          status: "failed",
          error: getOperationError(
            error,
            "READ_FAILED",
            "The adapter could not read the session.",
          ),
        }),
    );
  }

  #getReadOutcome(
    read: Read,
    answer: SessionAnswer<TUser>,
  ): ReadOutcome<TUser> {
    if (read.settled) {
      return { status: "answered", answer };
    }

    try {
      return { status: "answered", answer: parseSessionAnswer(answer) };
    } catch (error) {
      return { status: "failed", error: getInvalidAnswerError(error) };
    }
  }

  #settleRead(read: Read, outcome: ReadOutcome<TUser>) {
    if (read.settled) {
      return;
    }

    this.#markReadSettled(read);

    if (this.#activeRead === read) {
      this.#activeRead = null;
    }

    if (this.#phase.phase === "DISPOSED") {
      return;
    }

    const current = read.revision > this.#committed;

    if (outcome.status === "answered") {
      this.#handleReadAnswer(read, outcome.answer, current);
    } else {
      read.controller.abort();
      this.#handleReadFailure(read, outcome.error, current);
    }

    const queued = this.#nextReadWaiters;

    this.#nextReadWaiters = null;

    if (queued !== null) {
      this.#scheduleRead(queued);
    }

    this.#diagnostics.changed();
  }

  #handleReadAnswer(
    read: Read,
    answer: SessionAnswer<TUser>,
    current: boolean,
  ) {
    if (current) {
      this.#recordEvent({
        type: DIAGNOSTIC_TYPES.READ_COMPLETED,
        context: { status: answer.status },
      });
      this.#commitAnswer(answer, read.revision);
    } else {
      this.#recordEvent({ type: DIAGNOSTIC_TYPES.READ_SUPERSEDED });
    }

    for (const waiter of read.waiters) {
      waiter.resolve();
    }
  }

  #handleReadFailure(read: Read, error: AnchorError, current: boolean) {
    if (!current) {
      this.#recordEvent({ type: DIAGNOSTIC_TYPES.READ_SUPERSEDED });

      for (const waiter of read.waiters) {
        waiter.resolve();
      }

      return;
    }

    this.#recordEvent({
      type:
        error.code === "INVALID_ANSWER"
          ? DIAGNOSTIC_TYPES.ANSWER_INVALID
          : DIAGNOSTIC_TYPES.READ_FAILED,
      context: { code: error.code },
    });

    if (this.#store.get().status === "initializing") {
      this.#committed = read.revision;
      this.#publishState(Object.freeze({ status: "unavailable", error }), {
        type: DIAGNOSTIC_TYPES.SESSION_UNAVAILABLE,
        session: null,
        context: { code: error.code },
      });
    }

    for (const waiter of read.waiters) {
      waiter.reject(error);
    }
  }

  #commitAnswer(answer: SessionAnswer<TUser>, revision: number) {
    const phase = this.#phase;

    // A listener called out to earlier may already have committed a newer observation.
    if (phase.phase !== "OPEN" || revision < this.#committed) {
      return;
    }

    this.#committed = revision;

    if (answer.status === "signed-out") {
      if (this.#store.get().status === "signed-out") {
        return;
      }

      const ended = this.#record;

      this.#replaceRecord(null, null);

      if (!this.#isLatestCommit(revision)) {
        return;
      }

      this.#publishState(SIGNED_OUT_SESSION_STATE, {
        type: DIAGNOSTIC_TYPES.SESSION_SIGNED_OUT,
        session: ended === null ? null : ended.key,
      });

      return;
    }

    const identity = getSecurityContextFingerprint(answer);
    const record = this.#record;

    if (record === null || this.#fingerprint !== identity) {
      const accepted = this.#createRecord(answer, phase.session);

      this.#replaceRecord(accepted, identity);

      if (!this.#isLatestCommit(revision)) {
        return;
      }

      this.#publishState(this.#getSessionState(answer, accepted, null), {
        type: DIAGNOSTIC_TYPES.SESSION_ACCEPTED,
        session: accepted.key,
        context: { status: answer.status },
      });

      return;
    }

    const current = this.#store.get();
    const next = this.#getSessionState(answer, record, current);

    if (isSameSessionState(current, next)) {
      return;
    }

    this.#publishState(next, {
      type: DIAGNOSTIC_TYPES.SESSION_UPDATED,
      session: record.key,
      context: { status: answer.status },
    });
  }

  #createRecord(
    answer: IdentifiedAnswer<TUser>,
    session: AdapterSession<TUser, TProfile>,
  ) {
    const record: SessionRecord<TUser, TProfile> = new SessionRecord({
      key: createSessionKey(),
      identity: Object.freeze({
        principal: answer.principal,
        context: answer.context,
      }),
      tokens: this.#adapter.tokens,
      session,
      timeout: this.#timeout,
      diagnostics: this.#diagnostics,
      isActionRequired: () => this.#isActionRequired(record),
      isDisposed: () => this.#phase.phase === "DISPOSED",
      onEnded: (result) => this.#handleEnded(result),
    });

    return record;
  }

  #replaceRecord(
    next: SessionRecord<TUser, TProfile> | null,
    identity: string | null,
  ) {
    const previous = this.#record;

    this.#record = next;
    this.#fingerprint = identity;

    if (previous !== null || next !== null) {
      this.#generation += 1;
    }

    if (previous === null) {
      return;
    }

    previous.close(
      new AnchorError({
        code: "SESSION_CHANGED",
        message: "The session was replaced or ended.",
      }),
    );

    for (const replaced of this.#replacedEndings) {
      if (replaced.isEnding()) {
        continue;
      }

      this.#replacedEndings.delete(replaced);
    }

    if (!previous.isEnding()) {
      return;
    }

    // Its caller still waits for the ending, which dispose must settle.
    this.#replacedEndings.add(previous);
  }

  #getSessionState(
    answer: IdentifiedAnswer<TUser>,
    record: SessionRecord<TUser, TProfile>,
    current: SessionState<TUser, TProfile> | null,
  ): SessionState<TUser, TProfile> {
    const published = current === null ? null : getAcceptedSession(current);

    // Within one security context only the user can differ, so a session whose user did not change is kept as it is.
    const session: AnchorSession<TUser, TProfile> =
      published !== null &&
      published.key === record.key &&
      isStructurallyEqual(published.user, answer.user)
        ? published
        : Object.freeze({
            key: record.key,
            principal: answer.principal,
            user: answer.user,
            guest: answer.guest,
            impersonated: answer.impersonated,
            getToken: record.getToken,
            end: record.end,
          });

    if (answer.status === "signed-in") {
      return Object.freeze({ status: answer.status, session });
    }

    return Object.freeze({
      status: answer.status,
      action: answer.action,
      session,
    });
  }

  #isActionRequired(record: SessionRecord<TUser, TProfile>) {
    const state = this.#store.get();

    return (
      state.status === "action-required" && state.session.key === record.key
    );
  }

  #handleEnded(result: EndResult | null) {
    if (result !== null && result.local === "completed") {
      this.#revision += 1;
      this.#commitAnswer(SIGNED_OUT_SESSION_STATE, this.#revision);

      return;
    }

    this.#scheduleRead([]);
  }

  #isLatestCommit(revision: number) {
    return this.#phase.phase === "OPEN" && this.#committed === revision;
  }

  #publishState(
    state: SessionState<TUser, TProfile>,
    record: DiagnosticRecord,
  ) {
    this.#resolved = true;
    this.#store.set(state);
    this.#diagnostics.record(record);
    this.#diagnostics.changed();
    this.#ready.resolve();
  }

  #markReadSettled(read: Read) {
    read.settled = true;

    if (read.timer === null) {
      return;
    }

    clearTimeout(read.timer);
  }

  #recordIgnoredCallback(callback: string) {
    this.#diagnostics.record({
      type: DIAGNOSTIC_TYPES.CALLBACK_IGNORED,
      session: null,
      context: { callback },
    });
  }

  #recordEvent(record: Omit<DiagnosticRecord, "session">) {
    this.#diagnostics.record({ ...record, session: this.#record?.key ?? null });
  }
}
