---
description: "Write an Anchor adapter for another provider SDK: the { name, native, tokens, open } contract, the rules every adapter keeps, binding tokens and endings to their session, and the conformance suite it passes."
---

# Writing an adapter

An adapter translates one provider SDK onto Anchor's session contract and nothing more. It owns no policy: revisions, commits, session keys, token sharing, timeouts and errors all live in the core, and the core never branches on an adapter's name. Before writing one, check whether the provider speaks OpenID Connect, which the [OpenID Connect](adapters/oidc.md) adapter serves, or whether the [HTTP](adapters/http.md) adapter over your own client is enough.

## The contract

An adapter is a plain `{ name, native, tokens, open }`. `open(observer)` installs the provider's listeners synchronously and returns the session: `read`, and where the provider supports them, `getToken`, `end` and `dispose`.

```ts
import { AnchorError } from "@priemskiyyy/anchor";
import type {
  SessionAdapter,
  SessionAnswer,
  SessionIdentity,
} from "@priemskiyyy/anchor";

export type AcmeUser = { id: string; name: string };

export type AcmeAuthLike = {
  currentUser: () => Promise<AcmeUser | null>;
  onChange: (listener: () => void) => () => void;
  getAccessToken: (options: {
    userId: string;
    forceRefresh: boolean;
  }) => Promise<string>;
  signOut: () => Promise<void>;
};

const ACME_AUTHORITY = "https://id.acme.example";

const getSessionAnswer = (user: AcmeUser | null): SessionAnswer<AcmeUser> => {
  if (user === null) {
    return { status: "signed-out" };
  }

  return {
    status: "signed-in",
    principal: { authority: ACME_AUTHORITY, subject: user.id, tenant: null },
    user: { id: user.id, name: user.name },
    context: null,
    guest: false,
    impersonated: false,
  };
};

const isSessionUser = (user: AcmeUser, { principal }: SessionIdentity) =>
  user.id === principal.subject;

export const acme = ({
  sdk,
}: {
  sdk: AcmeAuthLike;
}): SessionAdapter<AcmeUser, AcmeAuthLike, "api"> => ({
  name: "acme",
  native: sdk,
  tokens: { api: {} },
  open: (observer) => {
    const unsubscribe = sdk.onChange(() => observer.invalidate());

    return {
      read: async () => getSessionAnswer(await sdk.currentUser()),
      getToken: async ({ session, forceRefresh }) => {
        const user = await sdk.currentUser();

        if (user === null || !isSessionUser(user, session)) {
          throw new AnchorError({
            code: "SESSION_CHANGED",
            message: "Acme holds another user now.",
          });
        }

        const value = await sdk.getAccessToken({
          userId: user.id,
          forceRefresh,
        });

        return { value, kind: "access-token", scheme: "Bearer" };
      },
      end: async ({ session }) => {
        const user = await sdk.currentUser();

        if (user === null || !isSessionUser(user, session)) {
          return {
            local: "not-applicable",
            remote: "not-applicable",
            navigation: null,
          };
        }

        await sdk.signOut();

        return { local: "completed", remote: "unknown", navigation: null };
      },
      dispose: unsubscribe,
    };
  },
});
```

`tokens` declares the profiles by name; the core reads only the names, and the adapter keeps whatever it needs per profile as the value. An adapter whose SDK describes the change it reports hands the core a complete answer with `observer.session(answer)`; one that can only notice a change, as here, calls `observer.invalidate()` and the core reads.

## The rules

1. **The factory is cold.** Creating the adapter reads nothing, subscribes to nothing and calls nothing. It may run at module scope and on a server.
2. **Take the SDK the application set up.** The option is `sdk`, typed structurally as `<Name>Like`, naming only what the adapter calls. Never import the provider at runtime, and never initialize, load or close it. A typecheck-only `<name>.contracts.ts` assigns the real SDK to the structural type, proves `native` keeps the real type, and refuses a wrong object with `@ts-expect-error`.
3. **`open` is synchronous.** It installs the provider's listeners and returns the session. It waits for nothing: readiness, such as `authStateReady()` or Clerk's `loaded`, is awaited inside `read`. It may push from inside `open`.
4. **Report what the provider proves.** `signed-out` only when the provider positively says there is no session; a provider that cannot tell throws from `read`. A pending or blocked session is `action-required` with the provider's step as `action.kind`.
5. **Map users to plain data.** The default user is a plain snapshot of the provider's user fields under the provider's own names; an optional `user` mapper types `TUser`. Never hand the core an SDK object.
6. **Identity is complete and deterministic.** `principal.authority` names the issuer, `subject` the provider's stable user id, `tenant` the provider's tenant partition or `null`. `context` fingerprints everything else that changes permissions: organization, provider session, impersonator. The same provider state always produces the same answer.
7. **Push when the provider says something changed.** A complete answer goes through `observer.session`; a change the adapter can only notice goes through `observer.invalidate()`. An adapter whose provider emits nothing observes nothing, and its documentation says to call `anchor.sync()` after native calls.
8. **Bind every operation to the session it names.** `getToken` mints only for the request's session and throws `AnchorError` `SESSION_CHANGED` when the SDK now holds another identity. `end` ends only the request's session and answers `not-applicable` when the SDK no longer holds it. Where the SDK can target a session, such as Clerk's `signOut({ sessionId })` or MSAL's `account`, it does.
9. **End only the current session.** Choose the SDK's narrowest sign-out explicitly, such as Supabase's `scope: "local"`, never its broader default. Report what was proven: `local`, `remote`, and a `navigation` URL when the provider needs a page visit to finish.
10. **Answer, do not guess.** A `forceRefresh` the SDK cannot honor throws `UNSUPPORTED`. A provider "login required" throws `INTERACTION_REQUIRED`. Any other failure throws what the SDK threw; the core makes it `TOKEN_FAILED` or `END_FAILED` with it as the `cause`.
11. **Silence after dispose.** `dispose` removes every listener the adapter installed. The core ignores late callbacks anyway, and records them as `callback ignored`.
12. **Types before runtime checks.** What the types enforce is not checked again at runtime. The adapter does only the work its provider needs.

Every call an adapter receives carries a `signal` that aborts when Anchor stops waiting for the answer: at the timeout, when the session is replaced, and on disposal. Pass it on to the SDK where the SDK takes one. The core checks every answer against the contract and refuses one outside it with `INVALID_ANSWER`, keeping a frozen copy of the known fields only.

## Test it

Keep a fake of the SDK beside the adapter, modelled on a named SDK version, and register the conformance suite:

```ts
import { testSessionAdapter } from "@priemskiyyy/anchor/testing";

import { acme } from "./acme";
import type { AcmeUser } from "./acme";

const createFakeAcme = () => {
  const listeners = new Set<() => void>();
  const held: { user: AcmeUser | null } = { user: null };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    currentUser: async () => held.user,
    onChange: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    getAccessToken: async ({ userId }: { userId: string }) => `acme:${userId}`,
    signOut: async () => {
      held.user = null;
      notify();
    },
    signIn: (subject: string) => {
      held.user = { id: subject, name: subject };
      notify();
    },
    switchSilently: (subject: string) => {
      held.user = { id: subject, name: subject };
    },
    listenerCount: () => listeners.size,
  };
};

testSessionAdapter({
  name: "acme",
  createFixture: () => {
    const sdk = createFakeAcme();

    return {
      adapter: acme({ sdk }),
      native: sdk,
      profiles: ["api"],
      signIn: (subject) => sdk.signIn(subject),
      signOut: () => sdk.signOut(),
      listeners: () => sdk.listenerCount(),
      observes: true,
      switchSilently: (subject) => sdk.switchSilently(subject),
    };
  },
});
```

The suite registers one `describe` block and checks, through a real Anchor, that the factory is cold and the adapter names itself, that `native` is the SDK the fixture passed, that an initial signed-out and signed-in state resolve, that a sign-in and a sign-out after the start are observed, by push when `observes` is `true` and by `sync()` always, that every answer is within the contract, that each declared profile mints a token for the current session, that the adapter refuses to mint for a session its SDK no longer holds, that ending completes locally or says it cannot tell, and that `dispose()` removes every listener the adapter installed.

It cannot prove refresh, persistence, remote revocation or event ordering against a provider, nor how you map each field. Test those against the fake, and against the real SDK in Node or jsdom where it runs there, as every adapter in this repository does. See [testing](testing.md) and the [verification matrix](verification.md).

## In this repository

An adapter package here keeps the layout of `CONTRIBUTING.md`: the factory alone in `src/<name>.ts`, one helper per file in `src/utils/`, the structural type in `src/types/<Name>Like.ts`, the fake in `src/fake<Sdk>.fixture.ts`, the contracts file, the conformance test and a real-SDK test where the SDK runs in Node or jsdom. Its `package.json` has no `dependencies`: the core is a peer, and the provider SDK an optional one. Its README has, in order, one paragraph, Installation, Create an Anchor, Options, Capabilities, How a session is mapped, Tokens, Ending the session, What Anchor does not normalize, Behavior, Tests and License.

A server adapter for `@priemskiyyy/anchor-server` is a smaller contract, `{ name, native, read }`; see [server and SSR](server-rendering.md#write-a-server-adapter).
