import type { AdapterSession } from "src/types/AdapterSession";
import type { DiagnosticOperation } from "src/types/DiagnosticOperation";
import type { EndResult } from "src/types/EndResult";
import type { GetTokenOptions } from "src/types/GetTokenOptions";
import type { DiagnosticRecord } from "src/types/internal/DiagnosticRecord";
import type { SessionIdentity } from "src/types/SessionIdentity";
import type { Token } from "src/types/Token";
import { AnchorError } from "src/utils/AnchorError";
import { createDeferred } from "src/utils/common/createDeferred";
import { DIAGNOSTIC_TYPES } from "src/utils/constants/diagnostics";
import { NOT_APPLICABLE_END_RESULT } from "src/utils/constants/end";
import { parseEndResult } from "src/utils/internal/answers/parseEndResult";
import { parseToken } from "src/utils/internal/answers/parseToken";
import { getInvalidAnswerError } from "src/utils/internal/answers/getInvalidAnswerError";
import type { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { createDisposedError } from "src/utils/internal/runtime/createDisposedError";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";
import { getOperationError } from "src/utils/internal/sessions/getOperationError";
import { TokenRequest } from "src/utils/internal/sessions/TokenRequest";

type Ending = {
  promise: Promise<EndResult>;
  resolve: (result: EndResult) => void;
  reject: (error: unknown) => void;
  controller: AbortController;
  timer: ReturnType<typeof setTimeout> | null;
  settled: boolean;
};

type State =
  | { state: "OPEN" }
  | { state: "ENDING"; ending: Ending }
  | { state: "CLOSED"; error: AnchorError };

type PendingToken<TProfile extends string> = {
  request: TokenRequest;
  profile: TProfile;
  forceRefresh: boolean;
};

type SessionRecordOptions<TUser, TProfile extends string> = {
  key: string;
  identity: SessionIdentity;
  tokens: Partial<Record<TProfile, unknown>>;
  session: AdapterSession<TUser, TProfile>;
  timeout: number;
  diagnostics: Diagnostics;
  isActionRequired: () => boolean;
  isDisposed: () => boolean;
  onEnded: (result: EndResult | null) => void;
};

export class SessionRecord<TUser, TProfile extends string> {
  key: string;
  #identity: SessionIdentity;
  #tokens: Partial<Record<TProfile, unknown>>;
  #session: AdapterSession<TUser, TProfile>;
  #timeout: number;
  #diagnostics: Diagnostics;
  #isActionRequired: () => boolean;
  #isDisposed: () => boolean;
  #onEnded: (result: EndResult | null) => void;
  #state: State = { state: "OPEN" };
  #runningEnding: Ending | null = null;
  #pendingTokens = new Map<string, PendingToken<TProfile>>();

  constructor({
    key,
    identity,
    tokens,
    session,
    timeout,
    diagnostics,
    isActionRequired,
    isDisposed,
    onEnded,
  }: SessionRecordOptions<TUser, TProfile>) {
    this.key = key;
    this.#identity = identity;
    this.#tokens = tokens;
    this.#session = session;
    this.#timeout = timeout;
    this.#diagnostics = diagnostics;
    this.#isActionRequired = isActionRequired;
    this.#isDisposed = isDisposed;
    this.#onEnded = onEnded;
  }

  getToken = (
    profile: TProfile,
    { signal, forceRefresh = false }: GetTokenOptions = {},
  ): Promise<Token> => {
    const refusal = this.#getTokenRefusal(profile, signal);

    if (refusal !== null) {
      return Promise.reject(refusal);
    }

    const requestKey = JSON.stringify([profile, forceRefresh]);
    const running = this.#pendingTokens.get(requestKey);

    if (running !== undefined) {
      const joined = running.request.join(signal);

      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_JOINED, {
        profile,
        forceRefresh,
      });
      this.#diagnostics.changed();

      return joined;
    }

    const request = new TokenRequest({
      mint: (adapterSignal) =>
        this.#requestToken(profile, forceRefresh, adapterSignal),
      timeout: this.#timeout,
      onSettled: () => {
        this.#pendingTokens.delete(requestKey);
        this.#diagnostics.changed();
      },
      onWaiterReleased: () => this.#diagnostics.changed(),
    });

    this.#pendingTokens.set(requestKey, { request, profile, forceRefresh });

    const waiting = request.join(signal);

    this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_REQUESTED, {
      profile,
      forceRefresh,
    });
    this.#diagnostics.changed();
    request.start();

    return waiting;
  };

  end = (): Promise<EndResult> => {
    const state = this.#state;

    if (this.#isDisposed()) {
      return Promise.reject(createDisposedError());
    }

    if (state.state === "CLOSED") {
      return Promise.resolve(NOT_APPLICABLE_END_RESULT);
    }

    if (state.state === "ENDING") {
      return state.ending.promise;
    }

    if (typeof this.#session.end !== "function") {
      return Promise.reject(
        new AnchorError({
          code: "UNSUPPORTED",
          message: "The adapter cannot end a session.",
        }),
      );
    }

    return this.#startEnding().promise;
  };

  isEnding = () => this.#runningEnding !== null;

  close = (error: AnchorError) => {
    const ending = this.#runningEnding;

    if (this.#state.state !== "CLOSED") {
      this.#state = { state: "CLOSED", error };
      this.#rejectPendingTokens(error);
    }

    ending?.controller.abort();

    // A replaced session's ending keeps running for its caller, until dispose, after which nothing may settle.
    if (ending !== null && error.code === "DISPOSED") {
      this.#markEndingSettled(ending);
      ending.reject(error);
    }

    this.#diagnostics.changed();
  };

  operations = (): DiagnosticOperation[] => {
    const tokens = [...this.#pendingTokens.values()].map(
      ({ request, profile, forceRefresh }): DiagnosticOperation => ({
        kind: "token",
        session: { key: this.key },
        profile,
        forceRefresh,
        waiters: request.countWaiters(),
      }),
    );

    if (this.#state.state !== "ENDING") {
      return tokens;
    }

    return [...tokens, { kind: "end", session: { key: this.key } }];
  };

  #getTokenRefusal(profile: TProfile, signal: AbortSignal | undefined) {
    const refusal = this.#getSessionRefusal();

    if (refusal !== null) {
      return refusal;
    }

    if (!Object.hasOwn(this.#tokens, profile)) {
      return new AnchorError({
        code: "INVALID_CONFIGURATION",
        message: `The adapter declares no token profile named "${profile}".`,
      });
    }

    if (typeof this.#session.getToken !== "function") {
      return new AnchorError({
        code: "UNSUPPORTED",
        message: "The adapter cannot mint tokens.",
      });
    }

    if (signal !== undefined && signal.aborted) {
      return new AnchorError({
        code: "ABORTED",
        message: "The caller stopped waiting for the token.",
      });
    }

    return null;
  }

  #getSessionRefusal() {
    const state = this.#state;

    if (this.#isDisposed()) {
      return createDisposedError();
    }

    if (state.state === "CLOSED") {
      return state.error;
    }

    if (state.state === "ENDING") {
      return new AnchorError({
        code: "SESSION_CHANGED",
        message: "The session is ending.",
      });
    }

    if (this.#isActionRequired()) {
      return new AnchorError({
        code: "ACTION_REQUIRED",
        message:
          "The provider requires a step before the session may mint tokens.",
      });
    }

    return null;
  }

  #requestToken(profile: TProfile, forceRefresh: boolean, signal: AbortSignal) {
    const session = this.#session;

    return new Promise<Token>((resolve, reject) => {
      if (typeof session.getToken !== "function") {
        reject(
          new AnchorError({
            code: "UNSUPPORTED",
            message: "The adapter cannot mint tokens.",
          }),
        );

        return;
      }

      resolve(
        session.getToken({
          profile,
          forceRefresh,
          session: this.#identity,
          signal,
        }),
      );
    }).then(
      (token) => this.#acceptToken(token, profile, forceRefresh),
      (error: unknown) => {
        const failure = getOperationError(
          error,
          "TOKEN_FAILED",
          "The adapter could not mint the token.",
        );

        this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_FAILED, {
          profile,
          forceRefresh,
          code: failure.code,
        });

        throw failure;
      },
    );
  }

  #acceptToken(token: Token, profile: TProfile, forceRefresh: boolean) {
    const refusal = this.#getSessionRefusal();

    if (refusal !== null) {
      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_DISCARDED, {
        profile,
        forceRefresh,
        code: refusal.code,
      });

      throw refusal;
    }

    try {
      const accepted = parseToken(token);

      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_RECEIVED, {
        profile,
        forceRefresh,
      });

      return accepted;
    } catch (error) {
      this.#recordEvent(DIAGNOSTIC_TYPES.ANSWER_INVALID, {
        operation: "token",
      });

      throw error;
    }
  }

  #startEnding() {
    const { promise, resolve, reject } = createDeferred<EndResult>();
    const controller = new AbortController();

    const ending: Ending = {
      promise,
      resolve,
      reject,
      controller,
      timer: null,
      settled: false,
    };

    ending.timer = setTimeout(
      () =>
        this.#failEnding(
          ending,
          new AnchorError({
            code: "TIMEOUT",
            message: `Ending the session took longer than ${this.#timeout} milliseconds.`,
          }),
        ),
      this.#timeout,
    );
    unrefTimer(ending.timer);
    this.#state = { state: "ENDING", ending };
    this.#runningEnding = ending;
    this.#rejectPendingTokens(
      new AnchorError({
        code: "SESSION_CHANGED",
        message: "The session is ending.",
      }),
    );
    this.#recordEvent(DIAGNOSTIC_TYPES.END_STARTED);
    this.#diagnostics.changed();

    const session = this.#session;

    new Promise<EndResult>((resolveEnd, rejectEnd) => {
      if (typeof session.end !== "function") {
        rejectEnd(
          new AnchorError({
            code: "UNSUPPORTED",
            message: "The adapter cannot end a session.",
          }),
        );

        return;
      }

      resolveEnd(
        session.end({ session: this.#identity, signal: controller.signal }),
      );
    }).then(
      (result) => this.#completeEnding(ending, result),
      (error: unknown) =>
        this.#failEnding(
          ending,
          getOperationError(
            error,
            "END_FAILED",
            "The adapter could not end the session.",
          ),
        ),
    );

    return ending;
  }

  #completeEnding(ending: Ending, answered: EndResult) {
    if (ending.settled) {
      return;
    }

    const result = this.#parseEnding(answered);

    if (result instanceof AnchorError) {
      this.#failEnding(ending, result);

      return;
    }

    this.#markEndingSettled(ending);
    this.#recordEvent(DIAGNOSTIC_TYPES.END_COMPLETED, {
      local: result.local,
      remote: result.remote,
    });

    if (this.#isCurrentEnding(ending)) {
      if (result.local !== "completed") {
        this.#state = { state: "OPEN" };
      }

      this.#diagnostics.changed();
      this.#onEnded(result);
    }

    ending.resolve(result);
  }

  #failEnding(ending: Ending, error: AnchorError) {
    if (ending.settled) {
      return;
    }

    this.#markEndingSettled(ending);
    ending.controller.abort();
    this.#recordEvent(DIAGNOSTIC_TYPES.END_FAILED, { code: error.code });

    if (this.#isCurrentEnding(ending)) {
      this.#state = { state: "OPEN" };
      this.#diagnostics.changed();
      this.#onEnded(null);
    }

    ending.reject(error);
  }

  #parseEnding(answered: EndResult) {
    try {
      return parseEndResult(answered);
    } catch (error) {
      this.#recordEvent(DIAGNOSTIC_TYPES.ANSWER_INVALID, { operation: "end" });

      return getInvalidAnswerError(error);
    }
  }

  #isCurrentEnding(ending: Ending) {
    const state = this.#state;

    return state.state === "ENDING" && state.ending === ending;
  }

  #markEndingSettled(ending: Ending) {
    ending.settled = true;

    if (this.#runningEnding === ending) {
      this.#runningEnding = null;
    }

    if (ending.timer === null) {
      return;
    }

    clearTimeout(ending.timer);
  }

  #rejectPendingTokens(error: AnchorError) {
    for (const { request } of [...this.#pendingTokens.values()]) {
      request.fail(error);
    }
  }

  #recordEvent(
    type: DiagnosticRecord["type"],
    context?: DiagnosticRecord["context"],
  ) {
    this.#diagnostics.record({
      type,
      session: this.key,
      ...(context === undefined ? {} : { context }),
    });
  }
}
