import { Anchor, AnchorError } from "@priemskiyyy/anchor";
import type {
  AdapterSession,
  AnchorDiagnosticEvent,
  AnchorErrorCode,
  AnchorSession,
  AnchorSnapshot,
  EndResult,
  SessionAdapter,
  SessionAnswer,
  SessionState,
  SyncHint,
  SyncHintSession,
  SyncHintTarget,
  Token,
  TokenRequest,
} from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import type { MockAdapter } from "@priemskiyyy/anchor/mock";
import { testSessionAdapter } from "@priemskiyyy/anchor/testing";
import type { SessionAdapterFixture } from "@priemskiyyy/anchor/testing";
import { expectTypeOf } from "vitest";

type AppUser = { id: string; email: string | null };

type AppAuthLike = {
  currentUser: AppUser | null;
  onChange: (listener: (user: AppUser | null) => void) => () => void;
  mint: (audience: string) => Promise<string>;
};

declare const sdk: AppAuthLike;

const getSessionAnswer = (user: AppUser | null): SessionAnswer<AppUser> => {
  if (user === null) {
    return { status: "signed-out" };
  }

  return {
    status: "signed-in",
    principal: {
      authority: "https://auth.example.com",
      subject: user.id,
      tenant: null,
    },
    user,
    context: null,
    guest: false,
    impersonated: false,
  };
};

const appAuth = (): SessionAdapter<AppUser, AppAuthLike, "api"> => ({
  name: "app-auth",
  native: sdk,
  tokens: { api: {} },
  open: (observer): AdapterSession<AppUser, "api"> => {
    const stop = sdk.onChange((user) =>
      observer.session(getSessionAnswer(user)),
    );

    return {
      read: () => getSessionAnswer(sdk.currentUser),
      getToken: async (request: TokenRequest<"api">): Promise<Token> => ({
        value: await sdk.mint(request.profile),
        kind: "access-token",
        scheme: "Bearer",
      }),
      dispose: stop,
    };
  },
});

export const anchor = new Anchor({ adapter: appAuth(), timeout: 5_000 });

expectTypeOf(anchor.native).toEqualTypeOf<AppAuthLike>();
expectTypeOf(anchor.session.get()).toEqualTypeOf<
  SessionState<AppUser, "api">
>();

export const getApiTokenValue = async (): Promise<string | null> => {
  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    return null;
  }

  expectTypeOf(state.session).toEqualTypeOf<AnchorSession<AppUser, "api">>();

  const token = await state.session.getToken("api", { forceRefresh: false });

  return token.value;
};

export const endCurrentSession = async (): Promise<EndResult | null> => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    return null;
  }

  const ended = await state.session.end();

  expectTypeOf(ended.navigation).toEqualTypeOf<{ url: string } | null>();

  return ended;
};

const syncOnEveryChange: SyncHint = ({ sync, session }) => {
  expectTypeOf(session.get()).toEqualTypeOf<SyncHintSession>();
  expectTypeOf(sync).toEqualTypeOf<SyncHintTarget["sync"]>();

  return session.subscribe(() => sync());
};

export const hinted = new Anchor({
  adapter: appAuth(),
  hints: [syncOnEveryChange],
});

export const isSessionChanged = (error: unknown) =>
  error instanceof AnchorError && error.code === "SESSION_CHANGED";

expectTypeOf<AnchorErrorCode>().toExtend<string>();
expectTypeOf(anchor.diagnostics.get()).toEqualTypeOf<AnchorSnapshot>();
expectTypeOf(anchor.diagnostics.events.subscribe)
  .parameter(0)
  .toEqualTypeOf<(event: AnchorDiagnosticEvent) => void>();

const mock: MockAdapter<AppUser, "api"> = createMockAdapter<AppUser, "api">({
  tokens: { api: {} },
});

expectTypeOf(new Anchor({ adapter: mock.adapter }).session.get()).toEqualTypeOf<
  SessionState<AppUser, "api">
>();

export const fixture: SessionAdapterFixture<AppUser, AppAuthLike, "api"> = {
  adapter: appAuth(),
  native: sdk,
  profiles: ["api"],
  signIn: () => {},
  signOut: () => {},
  listeners: () => 0,
  observes: true,
};

expectTypeOf(testSessionAdapter).parameter(0).toHaveProperty("createFixture");

// @ts-expect-error A consumer cannot reach the core's internals.
export { SessionRuntime } from "@priemskiyyy/anchor";
