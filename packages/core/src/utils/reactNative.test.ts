import { afterEach, expect, test, vi } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import { Anchor } from "src/utils/Anchor";
import { signedIn } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// React Native's AbortController polyfill implements only signal.aborted: no reason and no throwIfAborted.
class ReactNativeAbortSignal extends EventTarget {
  aborted = false;
}

class ReactNativeAbortController {
  signal = new ReactNativeAbortSignal();

  abort() {
    this.signal.aborted = true;
    this.signal.dispatchEvent(new Event("abort"));
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const stubReactNative = () => {
  vi.stubGlobal("AbortController", ReactNativeAbortController);
  // Hermes has no crypto.randomUUID.
  vi.stubGlobal("crypto", undefined);
};

test("on React Native, with an AbortSignal that has only aborted and no crypto, a session starts, mints, aborts one caller and disposes", async () => {
  stubReactNative();

  const mock = createMockAdapter<User, "api">({
    answer: signedIn("ada"),
    tokens: { api: {} },
    hold: { getToken: true },
  });

  const anchor = new Anchor({ adapter: mock.adapter });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  expect(state.session.key).toMatch(UUID);

  const controller = new AbortController();
  const leaving = state.session.getToken("api", { signal: controller.signal });
  const staying = state.session.getToken("api");

  controller.abort();

  await expect(leaving).rejects.toMatchObject({ code: "ABORTED" });

  mock.tokens[0]?.settle();

  await expect(staying).resolves.toMatchObject({ value: "api:ada:1" });

  const pending = state.session.getToken("api", { forceRefresh: true });

  anchor.dispose();

  await expect(pending).rejects.toMatchObject({ code: "DISPOSED" });
  expect(mock.tokens[1]?.request.signal.aborted).toBe(true);
});

test("on React Native, a read that outlives the timeout aborts its signal and the first state is unavailable", async () => {
  stubReactNative();
  vi.useFakeTimers();

  const mock = createMockAdapter<User>({ hold: { read: true } });
  const anchor = new Anchor({ adapter: mock.adapter, timeout: 1_000 });
  const started = anchor.start();

  vi.advanceTimersByTime(1_000);
  await started;

  expect(mock.reads[0]?.context.signal.aborted).toBe(true);
  expect(anchor.session.get()).toMatchObject({
    status: "unavailable",
    error: { code: "TIMEOUT" },
  });
});
