import { expectTypeOf } from "vitest";

import { createMockAdapter } from "src/mock/createMockAdapter";
import type { AnchorErrorCode } from "src/types/AnchorErrorCode";
import type { AnchorSession } from "src/types/AnchorSession";
import type { EndResult } from "src/types/EndResult";
import type { SessionAdapter } from "src/types/SessionAdapter";
import type { SessionAnswer } from "src/types/SessionAnswer";
import type { SessionState } from "src/types/SessionState";
import type { Token } from "src/types/Token";
import { Anchor } from "src/utils/Anchor";

type Profile = { id: string; displayName: string };

type AuthLike = { currentUser: Profile | null };

declare const auth: AuthLike;

declare const withTokens: SessionAdapter<Profile, AuthLike, "api" | "reports">;

declare const cookieOnly: SessionAdapter<Profile, AuthLike, never>;

const anchor = new Anchor({ adapter: withTokens });

expectTypeOf(anchor).toEqualTypeOf<
  Anchor<Profile, AuthLike, "api" | "reports">
>();
expectTypeOf(anchor.native).toEqualTypeOf<AuthLike>();
expectTypeOf(anchor.session.get()).toEqualTypeOf<
  SessionState<Profile, "api" | "reports">
>();
expectTypeOf(anchor.start).returns.toEqualTypeOf<Promise<void>>();
expectTypeOf(anchor.sync).returns.toEqualTypeOf<Promise<void>>();
expectTypeOf(anchor.dispose).returns.toEqualTypeOf<void>();

const state = anchor.session.get();

// @ts-expect-error The session exists only once the status says so.
export const unnarrowed = state.session;

if (state.status === "signed-in") {
  expectTypeOf(state.session).toEqualTypeOf<
    AnchorSession<Profile, "api" | "reports">
  >();
  expectTypeOf(state.session.user).toEqualTypeOf<Profile>();
  expectTypeOf(state.session.getToken("api")).toEqualTypeOf<Promise<Token>>();
  expectTypeOf(state.session.end()).toEqualTypeOf<Promise<EndResult>>();

  state.session.getToken("reports", {
    forceRefresh: true,
    signal: new AbortController().signal,
  });

  // @ts-expect-error The adapter declares no billing profile.
  state.session.getToken("billing");
}

if (state.status === "action-required") {
  expectTypeOf(state.action.kind).toEqualTypeOf<string>();
  expectTypeOf(state.session.key).toEqualTypeOf<string>();
}

if (state.status === "unavailable") {
  expectTypeOf(state.error.code).toEqualTypeOf<AnchorErrorCode>();
}

const tokenless = new Anchor({ adapter: cookieOnly });
const tokenlessState = tokenless.session.get();

if (tokenlessState.status === "signed-in") {
  // @ts-expect-error A cookie-only adapter declares no token profile at all.
  tokenlessState.session.getToken("api");
}

// @ts-expect-error The timeout is a number of milliseconds.
export const badTimeout = new Anchor({ adapter: withTokens, timeout: "5s" });

// @ts-expect-error An Anchor needs an adapter.
export const noAdapter = new Anchor({});

const mock = createMockAdapter({ tokens: { api: {} } });

expectTypeOf(new Anchor({ adapter: mock.adapter })).toEqualTypeOf<
  Anchor<unknown, { name: string }, "api">
>();

const typedMock = createMockAdapter<Profile, "api">({ tokens: { api: {} } });

expectTypeOf(typedMock.push)
  .parameter(0)
  .toEqualTypeOf<SessionAnswer<Profile>>();

export const native = auth;
