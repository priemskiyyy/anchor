import type { AnchorDiagnostics } from "src/types/AnchorDiagnostics";
import type { AnchorOptions } from "src/types/AnchorOptions";
import type { AnchorSnapshot } from "src/types/AnchorSnapshot";
import type { ObservableValue } from "src/types/ObservableValue";
import type { SessionAdapter } from "src/types/SessionAdapter";
import type { SessionState } from "src/types/SessionState";
import type { SyncHint } from "src/types/SyncHint";
import { AnchorError } from "src/utils/AnchorError";
import { copyFrozen } from "src/utils/common/copyFrozen";
import { ValueStore } from "src/utils/common/ValueStore";
import { DEFAULT_TIMEOUT, MAXIMUM_TIMEOUT } from "src/utils/constants/defaults";
import { INITIALIZING_SESSION_STATE } from "src/utils/constants/states";
import { Diagnostics } from "src/utils/internal/diagnostics/Diagnostics";
import { createDisposedError } from "src/utils/internal/runtime/createDisposedError";
import { getAcceptedSession } from "src/utils/internal/runtime/getAcceptedSession";
import { SessionRuntime } from "src/utils/internal/runtime/SessionRuntime";

type Lifecycle<TUser, TNative, TProfile extends string> =
  | { state: "IDLE" }
  | {
      state: "STARTED";
      runtime: SessionRuntime<TUser, TNative, TProfile>;
      started: Promise<void>;
    }
  | {
      state: "DISPOSED";
      runtime: SessionRuntime<TUser, TNative, TProfile> | null;
    };

const parseTimeout = (timeout: number) => {
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > MAXIMUM_TIMEOUT) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The timeout must be a whole number of milliseconds from 1 to ${MAXIMUM_TIMEOUT}.`,
    });
  }

  return timeout;
};

/**
 * One typed, reactive, race-safe view of the current session over one
 * provider adapter. Constructing it does nothing; `start()` opens the adapter
 * and resolves the first state.
 *
 * @example
 * ```ts
 * export const anchor = new Anchor({ adapter: firebase({ sdk: auth, tokens: { api: idToken() } }) });
 *
 * await anchor.start();
 *
 * const state = anchor.session.get();
 *
 * if (state.status === "signed-in") {
 *   const token = await state.session.getToken("api");
 * }
 * ```
 */
export class Anchor<TUser, TNative, TProfile extends string> {
  #adapter: SessionAdapter<TUser, TNative, TProfile>;
  #timeout: number;
  #hints: SyncHint[];
  #store = new ValueStore<SessionState<TUser, TProfile>>(
    INITIALIZING_SESSION_STATE,
  );
  #lifecycle: Lifecycle<TUser, TNative, TProfile> = { state: "IDLE" };
  #diagnostics = new Diagnostics({
    getSnapshot: () => this.#getDiagnosticSnapshot(),
    now: () => Date.now(),
  });

  constructor({
    adapter,
    timeout = DEFAULT_TIMEOUT,
    hints = [],
  }: AnchorOptions<TUser, TNative, TProfile>) {
    this.#adapter = adapter;
    this.#timeout = parseTimeout(timeout);
    this.#hints = [...hints];
    this.native = adapter.native;
  }

  /**
   * The session state: `initializing` until the first resolution, then
   * `signed-out`, `signed-in`, `action-required` or `unavailable`. Reading it
   * never starts anything.
   *
   * @example
   * ```ts
   * const stop = anchor.session.subscribe(() => render(anchor.session.get()));
   * ```
   */
  session: ObservableValue<SessionState<TUser, TProfile>> = {
    get: this.#store.get,
    subscribe: this.#store.subscribe,
  };

  /**
   * The SDK the adapter was given, typed as the application's own, for
   * everything Anchor does not normalize: signing in, switching accounts,
   * provider-specific tokens.
   *
   * @example
   * ```ts
   * await signInWithPopup(anchor.native, new GoogleAuthProvider());
   * ```
   */
  native: TNative;

  /**
   * A passive view for devtools: a snapshot of the lifecycle, the session and
   * the operations in flight, and a timeline of what happened. Observing it
   * starts, reads and mints nothing.
   *
   * @example
   * ```ts
   * anchor.diagnostics.events.subscribe((event) => console.debug(event.type));
   * ```
   */
  diagnostics: AnchorDiagnostics = this.#diagnostics.api;

  /**
   * Opens the adapter and resolves once the first state is known, whatever it
   * is. It is idempotent; a start that failed because the adapter could not
   * open may be tried again.
   *
   * @example
   * ```ts
   * await anchor.start();
   * ```
   */
  start = (): Promise<void> => {
    const lifecycle = this.#lifecycle;

    if (lifecycle.state === "DISPOSED") {
      return Promise.reject(createDisposedError());
    }

    if (lifecycle.state === "STARTED") {
      return lifecycle.started;
    }

    const runtime = new SessionRuntime({
      adapter: this.#adapter,
      timeout: this.#timeout,
      hints: this.#hints,
      store: this.#store,
      diagnostics: this.#diagnostics,
    });

    this.#lifecycle = { state: "STARTED", runtime, started: runtime.ready };
    this.#diagnostics.changed();

    try {
      runtime.open();
    } catch (error) {
      if (this.#lifecycle.state === "STARTED") {
        this.#lifecycle = { state: "IDLE" };
      }

      this.#diagnostics.changed();

      return Promise.reject(error);
    }

    return runtime.ready;
  };

  /**
   * Reads the provider's current state and resolves once a read that started
   * after the call settles. It forces no token refresh and reloads no profile.
   *
   * @example
   * ```ts
   * await linkWithCredential(anchor.native.currentUser, credential);
   * await anchor.sync();
   * ```
   */
  sync = (): Promise<void> => {
    const lifecycle = this.#lifecycle;

    if (lifecycle.state === "DISPOSED") {
      return Promise.reject(createDisposedError());
    }

    if (lifecycle.state === "IDLE") {
      return Promise.reject(
        new AnchorError({
          code: "NOT_STARTED",
          message: "Call anchor.start() before anchor.sync().",
        }),
      );
    }

    return lifecycle.runtime.sync();
  };

  /**
   * Stops observing the provider, rejects every pending operation with
   * `DISPOSED` and silences late callbacks. It never ends the session and never
   * touches the SDK; `session` keeps its last value.
   *
   * @example
   * ```ts
   * anchor.dispose();
   * ```
   */
  dispose = (): void => {
    const lifecycle = this.#lifecycle;

    if (lifecycle.state === "DISPOSED") {
      return;
    }

    const runtime = lifecycle.state === "STARTED" ? lifecycle.runtime : null;

    this.#lifecycle = { state: "DISPOSED", runtime };
    runtime?.dispose();
    this.#diagnostics.changed();
    this.#diagnostics.dispose();
  };

  #getDiagnosticSnapshot(): AnchorSnapshot {
    const state = this.#store.get();
    const lifecycle = this.#lifecycle;
    const runtime = lifecycle.state === "IDLE" ? null : lifecycle.runtime;

    const session = getAcceptedSession(state);

    return Object.freeze({
      state: this.#getLifecycleState(),
      adapter: Object.freeze({ name: this.#adapter.name }),
      session: Object.freeze({
        status: state.status,
        key: session === null ? null : session.key,
        principal: session === null ? null : session.principal,
        generation: runtime === null ? 0 : runtime.getGeneration(),
      }),
      operations: copyFrozen(
        lifecycle.state === "STARTED" ? lifecycle.runtime.operations() : [],
      ),
    });
  }

  #getLifecycleState(): AnchorSnapshot["state"] {
    const lifecycle = this.#lifecycle;

    if (lifecycle.state === "IDLE") {
      return "idle";
    }

    if (lifecycle.state === "DISPOSED") {
      return "disposed";
    }

    if (lifecycle.runtime.isResolved()) {
      return "started";
    }

    return "starting";
  }
}
