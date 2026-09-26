import { expect, test } from "vitest";

// Keep adapter construction on public exports to catch gaps in the authoring API.
import { Anchor, AnchorError } from "src/index";
import type { EndResult, SessionAdapter, SessionAnswer } from "src/index";
import { testSessionAdapter } from "src/testing";

type TinyUser = { id: string; name: string };

type TinyAuthLike = {
  user: TinyUser | null;
  subscribe: (listener: (user: TinyUser | null) => void) => () => void;
  mint: (user: TinyUser) => Promise<string>;
  signOut: () => Promise<void>;
};

const NOT_APPLICABLE: EndResult = {
  local: "not-applicable",
  remote: "not-applicable",
  navigation: null,
};

const createTinyAuth = () => {
  const listeners = new Set<(user: TinyUser | null) => void>();

  const sdk: TinyAuthLike = {
    user: null,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    mint: async (user) => `tiny.${user.id}`,
    signOut: async () => {
      sdk.user = null;

      for (const listener of [...listeners]) {
        listener(null);
      }
    },
  };

  const signIn = (id: string) => {
    sdk.user = { id, name: id.toUpperCase() };

    for (const listener of [...listeners]) {
      listener(sdk.user);
    }
  };

  return { sdk, listeners, signIn };
};

const getSessionAnswer = (
  user: TinyUser | null,
): SessionAnswer<{ name: string }> => {
  if (user === null) {
    return { status: "signed-out" };
  }

  return {
    status: "signed-in",
    principal: {
      authority: "https://tiny.example.com",
      subject: user.id,
      tenant: null,
    },
    user: { name: user.name },
    context: null,
    guest: false,
    impersonated: false,
  };
};

const tinyAuth = (
  sdk: TinyAuthLike,
): SessionAdapter<{ name: string }, TinyAuthLike, "api"> => ({
  name: "tiny",
  native: sdk,
  tokens: { api: {} },
  open: (observer) => {
    const stop = sdk.subscribe((user) =>
      observer.session(getSessionAnswer(user)),
    );

    return {
      read: () => getSessionAnswer(sdk.user),
      getToken: async ({ session }) => {
        const user = sdk.user;

        if (user === null || user.id !== session.principal.subject) {
          throw new AnchorError({
            code: "SESSION_CHANGED",
            message: "Tiny Auth holds another user.",
          });
        }

        return {
          value: await sdk.mint(user),
          kind: "access-token",
          scheme: "Bearer",
        };
      },
      end: async ({ session }) => {
        if (sdk.user?.id !== session.principal.subject) {
          return NOT_APPLICABLE;
        }

        await sdk.signOut();

        return {
          local: "completed",
          remote: "not-applicable",
          navigation: null,
        };
      },
      dispose: stop,
    };
  },
});

testSessionAdapter({
  name: "hand-written",
  createFixture: () => {
    const { sdk, listeners, signIn } = createTinyAuth();

    return {
      adapter: tinyAuth(sdk),
      native: sdk,
      profiles: ["api"],
      signIn,
      signOut: () => sdk.signOut(),
      listeners: () => listeners.size,
      observes: true,
      switchSilently: (id) => {
        sdk.user = { id, name: id };
      },
    };
  },
});

test("an adapter built from public exports alone types the whole path to a token", async () => {
  const { sdk, signIn } = createTinyAuth();

  signIn("ada");

  const anchor = new Anchor({ adapter: tinyAuth(sdk) });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  expect(state.session.user.name).toBe("ADA");
  await expect(state.session.getToken("api")).resolves.toEqual({
    value: "tiny.ada",
    kind: "access-token",
    scheme: "Bearer",
  });
});
