# @priemskiyyy/anchor-clerk

Clerk sessions for Anchor, over the Clerk instance your application loaded, in the browser with `@clerk/clerk-js` and on React Native with Clerk Expo's instance. The adapter answers Clerk's active session as a session of its user, with the active organization, the Clerk session and the impersonating actor in its identity, hears every change through `addListener`, reports a pending session as the task it waits for, mints the session token or a JWT template's token for each token profile, and ends the session by signing out exactly its id without navigating. Signing in, `setActive()`, the session tasks and Clerk's components stay with `anchor.native`, which is your instance.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-clerk @clerk/clerk-js
```

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { clerk, sessionToken } from "@priemskiyyy/anchor-clerk";
import { Clerk } from "@clerk/clerk-js";

const instance = new Clerk(publishableKey);

export const anchor = new Anchor({
  adapter: clerk({
    sdk: instance,
    tokens: {
      api: sessionToken(),
      supabase: sessionToken({ template: "supabase" }),
    },
  }),
});

await instance.load();
await anchor.start();
```

Start Anchor before or after `load()`: it is `initializing` until `load()` finishes, then answers what Clerk loaded. Every change after that, `setActive()` and sign-outs included, reaches Anchor through Clerk's listener; nothing needs `anchor.sync()`.

## React Native and Expo

Clerk Expo runs clerk-js on React Native, so this adapter serves it: pass the instance `getClerkInstance()` returns, the one `<ClerkProvider>` loads.

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { clerk, sessionToken } from "@priemskiyyy/anchor-clerk";
import { getClerkInstance } from "@clerk/expo";

export const anchor = new Anchor({
  adapter: clerk({
    sdk: getClerkInstance({ publishableKey }),
    tokens: { api: sessionToken() },
  }),
});
```

Anchor is `initializing` until `<ClerkProvider>` has loaded the instance. On a device Clerk Expo loads it headless, with no cookies, which is how the real-SDK tests below load clerk-js.

## Options

| Option   | Type                                | Default                          | What it does                                                          |
| -------- | ----------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| `sdk`    | `Clerk`                             | required                         | The Clerk instance you load, or the one `getClerkInstance()` returns. |
| `user`   | `(user: UserResource) => TUser`     | a snapshot of the profile fields | Maps the session's Clerk user to the plain data a session carries.    |
| `tokens` | `Record<string, ClerkSessionToken>` | none                             | The token profiles, each `sessionToken({ template })`.                |

## Capabilities

| Capability           | Clerk                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Observation          | Push, through `addListener`: sign-ins, `setActive()` switches of session or organization, completed tasks, sign-outs, and token refreshes. |
| Token profiles       | `sessionToken({ template? })`: the session token, or the token of a JWT template.                                                          |
| Forced refresh       | Yes: `getToken({ skipCache: true })`.                                                                                                      |
| End                  | Local and remote: `signOut({ sessionId })` removes the session through the Frontend API. Offline: local only, remote unknown.              |
| Navigation after end | Never: the adapter gives `signOut()` a callback, so it does not navigate.                                                                  |
| Runtimes             | Browsers, and React Native and Expo through Clerk Expo's instance.                                                                         |

## How a session is mapped

| Session               | From Clerk's active session (`clerk.session`)                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `status`              | `signed-in`, or `action-required` with `currentTask.key` as `action.kind` while the session is `pending`                                  |
| `principal.authority` | `https://` and the instance's `frontendApi`, the `iss` of its session tokens                                                              |
| `principal.subject`   | `user.id`, such as `user_2abc`                                                                                                            |
| `principal.tenant`    | `null`                                                                                                                                    |
| context               | `lastActiveOrganizationId`, the session's `id` and `actor.sub`: another organization, a new sign-in or an impersonation is a new session  |
| `user`                | `{ id, externalId, username, firstName, lastName, fullName, imageUrl, primaryEmailAddress, primaryPhoneNumber }`, or your mapper's result |
| `guest`               | `false`                                                                                                                                   |
| `impersonated`        | `true` while the session has an `actor`                                                                                                   |

The default user takes the primary email address and phone number as the strings they hold, `primaryEmailAddress.emailAddress` and `primaryPhoneNumber.phoneNumber`, and leaves out metadata, dates and the other resources; a mapper adds them. A session's tasks are Clerk's own names: `choose-organization`, `reset-password` and `setup-mfa`. It cannot mint tokens and can be ended.

## Tokens

`session.getToken(profile)` waits for Clerk to load, checks that Clerk's active session is still this session, then calls that session's `getToken({ template, skipCache })`, skipping Clerk's token cache when the caller asks for `forceRefresh`. The token's `kind` is `session-token` and its `scheme` is `Bearer`. clerk-js retries `getToken()` and reads the active organization again on every try, so the adapter checks the session again once the token arrives, and a switch while it was minted rejects with `SESSION_CHANGED`. A `null` from Clerk rejects with `TOKEN_FAILED`, and so does any failure Clerk throws, such as its offline error, with that error as the `cause`.

## Ending the session

`session.end()` acts only while Clerk's active session is this session, with its user, organization, Clerk session and actor. It calls `signOut(callback, { sessionId })` with the session's id and answers `{ local: "completed", remote: "completed", navigation: null }`. Clerk's `signOut()` navigates to your after-sign-out URL unless it is given a callback; the adapter gives it one that does nothing, so `end()` never navigates and you route the user yourself.

With one signed-in session, clerk-js removes every session on the client whatever id it is given, which is why the adapter only ever names the active one: when Clerk holds another session, it signs nobody out and answers `not-applicable`. In a multi-session application only this session is removed, and the other signed-in sessions stay: `anchor.native.signOut()` ends them all.

Offline, clerk-js answers the removal it could not send as done: the instance drops the session, but its client keeps it, so the session comes back when Clerk next loads, and the answer is `{ local: "completed", remote: "unknown", navigation: null }`. A removal the Frontend API fails while the browser is online rejects with `END_FAILED` and Clerk's error as its `cause`; clerk-js then leaves its active session `undefined` until it loads again, and reads wait for it until they time out.

## What Anchor does not normalize

Sign-in and sign-up flows, `setActive()`, the session tasks' screens, organization switching and management, multi-session switching, reverification, passkeys, Google One Tap, user profile updates, Clerk's components, the `__session` cookie and the handshake stay with clerk-js. Read them through `anchor.native`.

## Behavior

- The factory is cold: creating the adapter touches nothing on the instance.
- `open` adds one listener with `addListener`, which Clerk calls at once when it has loaded; that call is the first answer.
- A read waits until `loaded` is true, once Clerk's status is `ready` or `degraded`, and its active session is not `undefined`. A `load()` that fails turns the status to `error` and fails the read, so the first state is `unavailable`, never `signed-out`; a Clerk that is never loaded times out the same way.
- Clerk emits an `undefined` session while it loads, switches sessions or signs out. The adapter pushes nothing for it, and a read waits it out.
- A `null` session is `signed-out`: Clerk holds no active session.
- clerk-js calls its listeners inside `load()`, `setActive()` and `signOut()` without a `try`, so a `user` mapper that throws there asks Anchor for a read instead of failing them; the failed read is a diagnostic.
- clerk-js removes a status handler by splicing the list it is calling, which would skip the next handler, so a read that stops waiting removes its own a microtask later.
- `dispose()` removes the adapter's listener, never yours.

## Tests

Unit tests run over an in-process fake modelled on clerk-js 6.32.1, including the conformance suite. The contracts file typechecks the real `Clerk` class and its `UserResource`. The real clerk-js 6.32.1 runs in jsdom, loaded headless as Clerk Expo loads it, against an in-process Frontend API: Anchor started first stays `initializing` until `load()` finishes, a session with an organization and an actor, an organization switch through `setActive()` as a new session, a pending session as its task, the cached, forced and template tokens through the token endpoints, ending the only session and one of two, an offline ending clerk-js answers anyway, and `dispose()` removing the listener. Clerk Expo is not installed here: its instance is clerk-js's `Clerk`, and the interfaces `@clerk/shared` types such an instance with, `HeadlessBrowserClerk` and `BrowserClerk`, extend its `Clerk` interface, which declares every member the adapter uses exactly as the `Clerk` class does; that was read in the declarations, not typechecked. The standard browser load with its cookies and development browser, Clerk's components and a real Clerk instance were not run.

## License

MIT
