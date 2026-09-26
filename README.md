# Anchor

**Provider-independent session state for TypeScript.**

Anchor gives application code one typed, reactive, race-safe view of the current session, while authentication stays with your provider. Firebase, Supabase, Auth0, Better Auth or your own backend sign the user in; Anchor tells the rest of the application who is signed in, hands out tokens that belong to that session, and ends it.

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

## Why not read the provider SDK directly

Reading `auth.currentUser` is easy. What surrounds it is where applications break:

- **One state machine.** `initializing`, `signed-out`, `signed-in`, `action-required` and `unavailable`, instead of `user | null`. A failure to read is never mistaken for a logout.
- **Work belongs to its session.** A token is requested from the session object and can only ever resolve for that session. When the user switches accounts or organizations, pending work rejects instead of landing on the next user.
- **Stable identity.** `session.key` changes exactly when the security context does: another user, tenant, organization, guest upgrade or impersonation. It is random, so it is safe as a storage or cache scope.
- **Ending means this session.** `session.end()` never signs out every device or the identity provider behind your back, and it says what it proved locally and remotely.
- **Provider-native escape hatch.** `anchor.native` is your SDK, fully typed, for sign-in, account switching and everything Anchor does not normalize.
- **Passive diagnostics.** Observing Anchor never starts it, reads a token or calls the provider.

## What Anchor is not

Anchor does not sign anyone in, show login UI, run OAuth redirects, authorize requests, verify JWTs, store refresh tokens or intercept HTTP. Those stay with your provider SDK and your backend.

## Status

Anchor is at 0.1, not yet published. `CHANGELOG.md` lists what each package will ship with.

## Development

```sh
pnpm install --frozen-lockfile
pnpm check
```

`CONTRIBUTING.md` describes the layout, the style and the adapter rules.

## License

MIT
