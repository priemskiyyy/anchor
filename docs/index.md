---
description: "Anchor is provider-independent session state for TypeScript: one typed, reactive, race-safe view of the current session, with tokens and endings that belong to the session they were asked for."
---

<script setup>
import { withBase } from "vitepress";
</script>

# What Anchor is

Anchor gives application code one typed, reactive, race-safe view of the current session, while authentication stays with your provider. Firebase, Supabase, Auth0, Better Auth, Clerk or your own backend sign the user in; Anchor tells the rest of the application who is signed in, hands out tokens that belong to that session, and ends it.

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, supabase } from "@priemskiyyy/anchor-supabase";

export const anchor = new Anchor({
  adapter: supabase({ sdk: supabaseClient, tokens: { api: accessToken() } }),
});

await anchor.start();

const state = anchor.session.get();

if (state.status === "signed-in") {
  const token = await state.session.getToken("api");

  await state.session.end();
}
```

Reading `auth.currentUser` is easy. What surrounds it is where applications break, and that is what Anchor owns:

- **One state machine.** `initializing`, `signed-out`, `signed-in`, `action-required` and `unavailable`, instead of `user | null`. A failure to read is never mistaken for a sign-out.
- **Work belongs to its session.** A token is requested from the session object and can only ever resolve for that session. When the user switches accounts or organizations, pending work rejects instead of landing on the next user.
- **Stable identity.** `session.key` changes exactly when the security context does: another user, tenant, organization, provider session, guest upgrade or impersonation. It is random, so it is safe as a cache scope.
- **Ending means this session.** `session.end()` never signs out every device or the identity provider behind your back, and it says what it proved locally and remotely.
- **Your SDK stays yours.** `anchor.native` is the SDK you passed in, fully typed, for signing in, switching accounts and everything Anchor does not normalize.
- **Passive diagnostics.** Observing Anchor never starts it, reads the provider or mints a token.

## The guarantee, and where it ends

Work accepted for one session belongs to that session. When the session is replaced or ended, the work loses the right to affect the application: a token requested for Ada never resolves once Grace is signed in, and an ending started for Ada signs nobody else out. [Race conditions and guarantees](race-conditions.md) lists each rule and the test that holds it.

Anchor cannot undo what a provider SDK does on its own. When an SDK writes a late change to its own storage, Anchor ignores the stale result but cannot take the write back. Each adapter's page notes the orderings of its SDK that matter.

## What Anchor is not

Anchor does not sign anyone in, show login UI, run OAuth redirects, authorize requests, verify JWTs, store refresh tokens or intercept HTTP. Sign-up, one-time codes, passkeys, MFA, account linking, profile management and global or federated logout stay with your provider SDK and your backend, reachable through `anchor.native`.

## Where to go next

- [Getting started](getting-started.md) builds a working setup over Firebase in a few minutes.
- [Session state](session-state.md) explains the five states and the lifecycle around them.
- [Choose an adapter](adapters.md) compares what each provider can do.
- <a :href="withBase('/demo/')" target="_blank" rel="noreferrer">The Session Lab</a> runs in the page over simulated providers and shows the races Anchor handles. No account is needed.
