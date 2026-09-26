---
description: "Keep stored values apart per user and per session with Silo: durable preferences scoped by the principal, per-session state scoped by session.key and released when the session is replaced, and what a sign-out clears."
---

# Silo integration

[Silo](https://github.com/priemskiyyy/silo) is typed, reactive persistence for TypeScript: values in `localStorage`, IndexedDB, a device store or a backend, each under a key its schema declares. Its scopes put the same schema under a key prefix, `silo.scope("users:42")`, which is what keeping one user's values away from the next one needs. Neither library depends on the other; this page shows which Anchor value to scope by.

## Choose the scope

Two Anchor values name who a stored value belongs to, and they last differently:

| Scope by      | Lasts                                              | Use it for                                                                             |
| ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| The principal | as long as the provider's user id                  | durable per-user values: preferences, a draft that should survive a restart            |
| `session.key` | one session, never reused, new after every restart | per-session values that must never reach the next session: scratch state, unsent input |

`session.key` is random and new after every sign-in, page load and app restart, so a durable store scoped by it would orphan its values on every restart. The principal is stable: `authority` names the issuer, `subject` the provider's user id and `tenant` its tenant or `null`. Encode each part, because Silo splits a scope path at `:` and a segment built from outside data could otherwise reach another scope's keys, and leave a `null` tenant out, because Silo refuses an empty segment:

```ts
import type { Principal, SessionState } from "@priemskiyyy/anchor";

export const getUserScope = ({ authority, tenant, subject }: Principal) =>
  ["users", authority, ...(tenant === null ? [] : [tenant]), subject]
    .map(encodeURIComponent)
    .join(":");

export const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
) => {
  if (state.status !== "signed-in") {
    return null;
  }

  return state.session;
};
```

## Durable values per user

Scope a Silo provider by the signed-in user, so every value hook below it reads and writes under that user's prefix, and a user switch switches the keyspace without touching a component. Mount it only once there is a session: an omitted scope selects Silo's root, it does not suspend persistence.

<!-- snippet: fragment -->

```tsx
import { useSession } from "@priemskiyyy/anchor-react";
import { SiloProvider } from "@priemskiyyy/silo-react";

export const UserValues = ({ children }: { children: ReactNode }) => {
  const scope = useSession((state) =>
    state.status === "signed-in" ? getUserScope(state.session.principal) : null,
  );

  if (scope === null) {
    return <SignIn />;
  }

  return (
    <SiloProvider silo={silo} scope={scope}>
      {children}
    </SiloProvider>
  );
};
```

The selector answers a string, compared with `Object.is`, so an update of the user's data that keeps the principal renders nothing, and another user is another scope.

## Per-session values

Values that must never outlive the session, such as scratch state, belong under `session.key`, in memory: the key is new after a reload anyway, so a persistent storage would only collect values nobody reads again. When the key changes, clear the previous session's scope and release it:

<!-- snippet: fragment -->

```ts
import { Silo, value } from "@priemskiyyy/silo";
import { memory } from "@priemskiyyy/silo-memory";

const scratch = new Silo({
  storages: {
    default: {
      adapters: [memory()],
      schema: { draft: value({ fallback: "" }) },
    },
  },
});

let currentKey: string | null = null;

anchor.session.subscribe(() => {
  const key = getSignedInSession(anchor.session.get())?.key ?? null;

  if (key === currentKey) {
    return;
  }

  const previousKey = currentKey;

  currentKey = key;

  if (previousKey === null) {
    return;
  }

  const previous = scratch.scope(`sessions:${previousKey}`);

  previous
    .clear()
    .then(() => previous.release())
    .catch(reportError);
});

const saveDraft = (text: string) => {
  if (currentKey === null) {
    return;
  }

  scratch.scope(`sessions:${currentKey}`).value("draft").set(text);
};
```

Silo's `clear()` removes every key the current schema declares at that exact scope, across every storage, and `release()` waits for the scope's writes and frees its cached records. A draft scoped this way can never be shown to the next user, because the next user's session has another key.

## Signing out

Durable values are meant to outlive a sign-out. When a sign-out must leave nothing of the user on the device, as on a shared computer, Silo's own recipe clears the account scope and then releases it. Do it where your sign-out flow knows the ending finished, with the principal of the session it ended:

<!-- snippet: fragment -->

```ts
const handleSignOutPress = async () => {
  const account = silo.scope(getUserScope(session.principal));

  const result = await session.end();

  if (result.local !== "completed") {
    return;
  }

  await account.clear();
  await account.release();
};
```

`clear()` is schema driven: a key an older schema wrote at that scope survives it, so remove obsolete keys in a Silo migration.

## Keep tokens out of storage

Anchor hands out a token for one request and keeps none, and caching is the provider SDK's. Do not copy a token into Silo: ask the session for one when a request needs it, so it can never outlive or cross its session.

## What was verified

The Anchor half of this page, `getUserScope` and `getSignedInSession`, is typechecked against the built packages with the rest of the documentation. The Silo half was written from the source and documentation of Silo 0.1.0, its `scope()`, `value()`, `clear()`, `release()`, `memory()` and `SiloProvider`, and is neither typechecked nor run here, because Silo is not installed in this repository.
