import type { Token } from "src/types/Token";
import { AnchorError } from "src/utils/AnchorError";
import { createDeferred } from "src/utils/common/createDeferred";
import { unrefTimer } from "src/utils/internal/runtime/unrefTimer";

type Waiter = {
  resolve: (token: Token) => void;
  reject: (error: unknown) => void;
  release: () => void;
};

type TokenRequestOptions = {
  mint: (signal: AbortSignal) => Promise<Token>;
  timeout: number;
  onSettled: () => void;
  onWaiterReleased: () => void;
};

export class TokenRequest {
  #mint: (signal: AbortSignal) => Promise<Token>;
  #timeout: number;
  #onSettled: () => void;
  #onWaiterReleased: () => void;
  #controller = new AbortController();
  #waiters = new Set<Waiter>();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #settled = false;

  constructor({
    mint,
    timeout,
    onSettled,
    onWaiterReleased,
  }: TokenRequestOptions) {
    this.#mint = mint;
    this.#timeout = timeout;
    this.#onSettled = onSettled;
    this.#onWaiterReleased = onWaiterReleased;
  }

  countWaiters = () => this.#waiters.size;

  join = (signal: AbortSignal | undefined): Promise<Token> => {
    const { promise, resolve, reject } = createDeferred<Token>();
    const waiter: Waiter = { resolve, reject, release: () => {} };

    if (signal !== undefined) {
      const handleAbort = () => this.#releaseWaiter(waiter);

      signal.addEventListener("abort", handleAbort);
      waiter.release = () => signal.removeEventListener("abort", handleAbort);
    }

    this.#waiters.add(waiter);

    return promise;
  };

  start = () => {
    // A listener of the request's own diagnostic may already have settled it, by disposing the Anchor.
    if (this.#settled) {
      return;
    }

    this.#timer = setTimeout(
      () =>
        this.fail(
          new AnchorError({
            code: "TIMEOUT",
            message: `The token request took longer than ${this.#timeout} milliseconds.`,
          }),
        ),
      this.#timeout,
    );
    unrefTimer(this.#timer);
    this.#mint(this.#controller.signal).then(
      (token) => this.#resolveWaiters(token),
      (error: unknown) => this.fail(error),
    );
  };

  fail = (error: unknown) => {
    if (!this.#markSettled()) {
      return;
    }

    this.#controller.abort();

    for (const waiter of this.#takeAllWaiters()) {
      waiter.reject(error);
    }
  };

  #resolveWaiters(token: Token) {
    if (!this.#markSettled()) {
      return;
    }

    for (const waiter of this.#takeAllWaiters()) {
      waiter.resolve(token);
    }
  }

  #releaseWaiter(waiter: Waiter) {
    this.#waiters.delete(waiter);
    waiter.release();
    waiter.reject(
      new AnchorError({
        code: "ABORTED",
        message: "The caller stopped waiting for the token.",
      }),
    );

    if (this.#waiters.size > 0) {
      this.#onWaiterReleased();

      return;
    }

    if (!this.#markSettled()) {
      return;
    }

    this.#controller.abort();
  }

  #markSettled() {
    if (this.#settled) {
      return false;
    }

    this.#settled = true;

    if (this.#timer !== null) {
      clearTimeout(this.#timer);
    }

    this.#onSettled();

    return true;
  }

  #takeAllWaiters() {
    const waiters = [...this.#waiters];

    this.#waiters.clear();

    for (const waiter of waiters) {
      waiter.release();
    }

    return waiters;
  }
}
