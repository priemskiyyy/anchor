---
description: "Anchor on React Native and Expo: the adapter for each SDK, the React binding as it is, the foreground hint, pull to refresh with anchor.sync(), each SDK's persistence, Hermes, and what was verified."
---

# React Native and Expo

React Native is a first-class runtime. The core runs on Hermes, the React binding is the React Native binding, and the providers whose SDK runs its web API on React Native are served by their web adapter. Two SDKs have a React Native API of their own, and each has its own package whose factory keeps the provider's name.

| SDK on React Native                                  | Package                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| React Native Firebase, `@react-native-firebase/auth` | [`@priemskiyyy/anchor-firebase-react-native`](adapters/firebase-react-native.md) |
| react-native-auth0                                   | [`@priemskiyyy/anchor-auth0-react-native`](adapters/auth0-react-native.md)       |
| The Firebase JS SDK, `firebase`                      | [`@priemskiyyy/anchor-firebase`](adapters/firebase.md)                           |
| supabase-js                                          | [`@priemskiyyy/anchor-supabase`](adapters/supabase.md)                           |
| Better Auth with `@better-auth/expo`                 | [`@priemskiyyy/anchor-better-auth`](adapters/better-auth.md)                     |
| Clerk Expo, through `getClerkInstance()`             | [`@priemskiyyy/anchor-clerk`](adapters/clerk.md)                                 |
| Amplify v6 with `@aws-amplify/react-native`          | [`@priemskiyyy/anchor-amplify`](adapters/amplify.md)                             |
| Your own backend                                     | [`@priemskiyyy/anchor-http`](adapters/http.md)                                   |

The adapters for auth0-spa-js, MSAL.js, oidc-client-ts, keycloak-js, okta-auth-js, AuthKit and next-auth name browsers as their runtime.

## Set it up

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase-react-native";
import { appState } from "@priemskiyyy/anchor-react-native";
import { getAuth } from "@react-native-firebase/auth";
import { AppState } from "react-native";

export const anchor = new Anchor({
  adapter: firebase({ sdk: getAuth(), tokens: { api: idToken() } }),
  hints: [appState({ sdk: AppState })],
});

anchor.start().catch((error: unknown) => {
  console.warn("The session adapter could not open", error);
});
```

Publish it with `AnchorProvider` from [`@priemskiyyy/anchor-react`](react.md) and read it with `useSession()`, exactly as on the web: `useSyncExternalStore` works on React Native unchanged, and nothing in the binding touches the DOM.

```tsx
import { AnchorProvider, useSession } from "@priemskiyyy/anchor-react";
import { Text } from "react-native";

const Account = () => {
  const name = useSession((state) =>
    state.status === "signed-in" ? state.session.user.displayName : null,
  );

  return <Text>{name ?? "Welcome"}</Text>;
};

export const Root = () => (
  <AnchorProvider anchor={anchor}>
    <Account />
  </AnchorProvider>
);
```

## Read again in the foreground

`@priemskiyyy/anchor-react-native` ships one hint, `appState({ sdk: AppState })`. Pass React Native's `AppState`; the hint never imports `react-native` itself.

```sh
pnpm add @priemskiyyy/anchor-react-native
```

- A transition to `active` from `background`, `inactive` or an unknown state reads again. Going to the background or inactive reads nothing, and a repeated `active` report is not a return.
- An app started in the background reads again the first time it comes to the foreground.
- A quick background and foreground costs one read and one queued read at most, because reads go through Anchor's own read path.

Foregrounding is a reason to read, never proof that a session is valid, and nothing refreshes in the background: the provider SDK refreshes its own tokens. It works the same on Expo and in bare React Native.

## Pull to refresh

A pull to refresh is `anchor.sync()`:

```tsx
import { useAnchor } from "@priemskiyyy/anchor-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { RefreshControl, ScrollView } from "react-native";

export const RefreshableScreen = ({ children }: { children: ReactNode }) => {
  const anchor = useAnchor();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    anchor
      .sync()
      .catch((error: unknown) => {
        console.warn("The session could not be read", error);
      })
      .finally(() => {
        setRefreshing(false);
      });
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {children}
    </ScrollView>
  );
};
```

A `sync()` that fails leaves the state as it was: a failed read is never a sign-out.

## Persistence stays with the SDK

Secure storage and restoring a session after a restart are the SDK's. Each adapter's first read waits for its SDK's restoration, so a slow restore is `initializing`, never `signed-out`:

- **React Native Firebase** restores its user natively; the first read awaits `authStateReady()`, which settles once the native SDK reported its first auth state.
- **The Firebase JS SDK** restores from the persistence you configure; the first read awaits `authStateReady()`.
- **supabase-js** restores its stored session itself; the first state comes from `auth.getSession()`. supabase-js's `startAutoRefresh` and `stopAutoRefresh` around `AppState` changes stay in your application.
- **Better Auth** with the Expo plugin keeps the session cookie in the storage you pass, such as `expo-secure-store`. Every read is the session atom's own fetch, so a start without a network answers the session the plugin cached, and an ending without a network still clears the session on the device. The plugin refetches when the app returns to the foreground, so `appState()` is optional there.
- **Clerk Expo** loads its instance headless; Anchor is `initializing` until `<ClerkProvider>` has loaded it.
- **Amplify** keeps its tokens in AsyncStorage and the first read waits for them. Amplify dispatches `signedOut` without waiting for AsyncStorage to finish removing the tokens, so the adapter pushes `signed-out` on that event instead of reading. With the hosted UI, a user who closes the logout page leaves `session.end()` answering `local: "unknown"`, and the session stays.
- **react-native-auth0** keeps the login in its credentials manager, and every call waits for its native module to initialize. It emits no events, so call `anchor.sync()` after `saveCredentials()` or `clearCredentials()`.

## Hermes

- A session key is `crypto.randomUUID()` where it exists and a random version 4 UUID where it does not, as on Hermes.
- Anchor never calls `signal.throwIfAborted()`, the static `AbortSignal` helpers or `signal.reason`, which React Native's `AbortController` polyfill lacks; the library's ESLint configuration refuses them. One caller's aborted token request rejects with `ABORTED` and no cause on every platform for the same reason.
- A core test runs the lifecycle under a React Native style `AbortSignal` and without `crypto`: a session starts, mints, aborts one caller and disposes, and a read that outlives the timeout makes the first state `unavailable`.
- Every package React Native can use pairs `import` with `default` in its `exports`, so Jest resolves it.

## Expo

Anchor's packages are plain JavaScript and need no config plugin. Your provider SDK may: React Native Firebase and react-native-auth0 need their native modules, so they run in a development build or a bare app, never in Expo Go. Better Auth needs `expoClient` from `@better-auth/expo/client` on the client and the `expo()` plugin with your app's scheme on the server; its page shows both.

## What was verified

Nothing here has run on a device or a simulator. The React Native adapters run against fakes typechecked against the real SDKs' declarations, and against the real SDKs' JavaScript in Node where it runs there: react-native-auth0's over a replaced native module that answers with the codes its iOS bridge gives, React Native Firebase's over the module it registers for platforms without the native SDKs, and Better Auth's Expo plugin against a real server with only the native modules replaced. The `appState()` hint's contract is typechecked against React Native 0.86.3's own `AppState`. See the [verification matrix](verification.md).
