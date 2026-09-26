---
description: "Auth0 sessions for Anchor on React Native over react-native-auth0: the credentials manager's stored login is the session, accessToken() mints the login's or one API's token, a refused renewal is INTERACTION_REQUIRED, and ending clears the device."
---

# Auth0 on React Native

`@priemskiyyy/anchor-auth0-react-native` reads the react-native-auth0 client your application created. It answers the login the credentials manager stores as a session of your Auth0 domain's issuer and the ID token's subject, read with react-native-auth0's own `parseIdToken`; mints an access token for each profile through the credentials manager, and for one API's audience through `getApiCredentials`; and ends the session by clearing the credentials on the device. react-native-auth0 emits no events, so call `anchor.sync()` after a login. Logging in, saving the credentials and ending Auth0's own session in the browser stay with `anchor.native`, which is your client.

## Install

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-auth0-react-native react-native-auth0
```

react-native-auth0 5.8 or later, the first release that exports `parseIdToken`, and below 6. It needs its native module: a development build or a bare app, never Expo Go.

## Create an Anchor

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { accessToken, auth0 } from "@priemskiyyy/anchor-auth0-react-native";
import Auth0, { parseIdToken } from "react-native-auth0";

const domain = "acme.us.auth0.com";
const client = new Auth0({ domain, clientId });

export const anchor = new Anchor({
  adapter: auth0({
    sdk: client,
    domain,
    parseIdToken,
    tokens: {
      api: accessToken({
        audience: "https://api.example.com",
        scope: "read:projects",
      }),
    },
  }),
});

export const signIn = async () => {
  const credentials = await anchor.native.webAuth.authorize({
    scope: "openid profile email offline_access",
  });

  await anchor.native.credentialsManager.saveCredentials(credentials);
  await anchor.sync();
};

export const signOut = async () => {
  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    return;
  }

  const result = await state.session.end();

  if (result.remote !== "unknown") {
    return;
  }

  await anchor.native.webAuth.clearSession();
};

await anchor.start();
```

On iOS and Android `webAuth.authorize()` saves nothing by itself: the `Auth0Provider` hook saves for you, the `Auth0` class does not, and react-native-auth0 emits nothing Anchor could observe. Call `anchor.sync()` after `saveCredentials()`, `clearCredentials()` or any other native call that changes the stored login. Request `offline_access` at login: renewals and API credentials need the refresh token.

## Options

| Option         | Type                               | Default                          | What it does                                                                                                                      |
| -------------- | ---------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `sdk`          | `Auth0`                            | required                         | The client `new Auth0({ domain, clientId })` returned.                                                                            |
| `domain`       | `string`                           | required                         | The domain you gave `new Auth0()`. Sessions name `https://<domain>/`, the issuer Auth0 writes into the ID tokens it issues there. |
| `parseIdToken` | `(idToken: string) => User`        | required                         | react-native-auth0's own `parseIdToken`; the adapter reads the stored ID token with it and decodes nothing itself.                |
| `user`         | `(user: User) => TUser`            | a snapshot of the profile fields | Maps the user `parseIdToken` answers to the plain data a session carries.                                                         |
| `tokens`       | `Record<string, Auth0AccessToken>` | none                             | The token profiles, each `accessToken({ audience?, scope? })`.                                                                    |

## Capabilities

| Capability           | Auth0 on React Native                                                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observation          | None: react-native-auth0 emits no events. Call `anchor.sync()` after a login.                                                                                                                 |
| Token profiles       | `accessToken()`: the login's own access token, through `getCredentials()`. `accessToken({ audience, scope })`: an access token for one API, through `getApiCredentials()`.                    |
| Forced refresh       | Yes: `getCredentials()` forced for the login's token; for an audience, `clearApiCredentials()` before `getApiCredentials()`, since 5.11.1's `getApiCredentials()` takes no flag to force one. |
| End                  | Local: `clearCredentials()`, after `clearApiCredentials()` for each declared audience. Remote: unknown until you call `webAuth.clearSession()`.                                               |
| Navigation after end | Never: on React Native, `webAuth.clearSession()` opens Auth0's logout page itself, in the browser session the login used.                                                                     |
| Runtimes             | iOS and Android, through react-native-auth0's native module. Browsers: `@priemskiyyy/anchor-auth0` over auth0-spa-js.                                                                         |

## How a session is mapped

| Session               | From the stored login                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `principal.authority` | `https://<domain>/`, from the `domain` option: the `iss` Auth0 writes into that domain's ID tokens |
| `principal.subject`   | `sub`, as `parseIdToken` reads it from the ID token                                                |
| `principal.tenant`    | `null`                                                                                             |
| context               | `org_id`: another organization is a new session                                                    |
| `user`                | `{ sub, name, nickname, picture, email, emailVerified }`, or your mapper's result                  |
| `guest`               | `false`                                                                                            |
| `impersonated`        | `true` when the ID token carries an `act` claim                                                    |

`parseIdToken` leaves the ID token's protocol claims out of the user it builds, `iss` and `sid` among them, and names `email_verified` `emailVerified`. So the authority comes from `domain`: for a login through the same domain it is the `iss` the web adapter reads, and one user is the same principal in `@priemskiyyy/anchor-auth0` and here. The context carries the organization but not the Auth0 session, so a new login of the same user in the same organization keeps its session key here, where the web adapter gives it a new one. The default user names `emailVerified` as react-native-auth0 does, where the web adapter's names it `email_verified`.

## Tokens

`session.getToken(profile)` first reads the stored login through `hasValidCredentials()` and `getCredentials()`, and rejects with `SESSION_CHANGED` when there is none or its ID token names another subject or organization.

- A profile without an audience answers the login's access token. With a `scope`, or when forced, it asks `getCredentials(scope, undefined, undefined, forceRefresh)` and checks the renewed ID token again. A scope other than the stored one renews the stored login with that scope, as react-native-auth0 does, so give a scoped profile an audience.
- A profile with an audience asks `getApiCredentials(audience, scope)`, which exchanges the refresh token once and caches the answer per audience and scope; forced, it clears that cache first with `clearApiCredentials(audience, scope)`.
- Nothing in API credentials names their user, and react-native-auth0 keeps them when another login is saved or `clearCredentials()` runs. So a login's first mint for each audience and scope clears that cache too, and exchanges run one at a time: a token another login cached is never answered, at the cost of one exchange per audience after each start. The stored login is read again after the exchange, so a login saved meanwhile rejects with `SESSION_CHANGED`.
- A read that finds another login than the last forgets which login filled each cache, since that login may have minted through `anchor.native`. A native `getApiCredentials()` for a declared audience between two logins Anchor never read is outside the guard, so call `anchor.sync()` after every login.

The token's `kind` is `access-token` and its `scheme` is the `tokenType` the credentials manager answers: `DPoP`, react-native-auth0 5's default, whose requests then need the headers `anchor.native.getDPoPHeaders()` builds, or `Bearer` with `useDPoP: false`.

The credentials manager's errors carry a normalized `type`. `RENEW_FAILED`, a renewal Auth0 refused (iOS reports its OAuth code, such as `invalid_grant`, and Android `RENEW_FAILED`), `NO_REFRESH_TOKEN`, `SESSION_EXPIRED`, `DPOP_KEY_MISSING` and `DPOP_KEY_MISMATCH` reject with `INTERACTION_REQUIRED`: log the user in again with `webAuth.authorize()`. `NO_CREDENTIALS` rejects with `SESSION_CHANGED`. Any other failure, such as `NO_NETWORK`, `API_EXCHANGE_FAILED` or `BIOMETRICS_FAILED`, rejects with `TOKEN_FAILED` and the react-native-auth0 error as its `cause`.

## Ending the session

`session.end()` acts only while the stored login's ID token names the session's subject and organization. It clears the API credentials of every profile with an audience, because `getApiCredentials` caches them apart from the login, then calls `clearCredentials()`, and answers `{ local: "completed", remote: "unknown", navigation: null }`. The refresh token is not revoked, and Auth0's own session lives on in the browser the login used, unless it was an iOS login with `ephemeralSession: true`, so the next `webAuth.authorize()` may sign the same user in without asking. Ending that session needs a browser round trip, which the adapter never opens on its own: `signOut` above calls `webAuth.clearSession()`, which opens Auth0's logout page in that browser session and returns to your app.

When the credentials manager holds another login, or none, the adapter clears nothing and answers `not-applicable`. When the access token has expired and Auth0 refuses to renew it, the stored login cannot be read, so `end()` rejects with `END_FAILED`: clear it with `anchor.native.credentialsManager.clearCredentials()` and call `anchor.sync()`. To revoke the refresh token, call `anchor.native.auth.revoke({ refreshToken })` before ending.

## Behavior

- The factory is cold: creating the adapter touches nothing on the client.
- A read asks `hasValidCredentials()`: `false`, the credentials manager's word that it holds nothing it can use or renew, is `signed-out`. Otherwise it reads `getCredentials()`, which renews an expired access token first, and names the session from its ID token; a `NO_CREDENTIALS` answer there is `signed-out` too.
- react-native-auth0 waits for its native module to initialize before every credentials manager call, so Anchor is `initializing` until then, never `signed-out`.
- A read whose renewal fails, because Auth0 refused the refresh token or the network is down, fails: the first state is then `unavailable`, and a later failing `sync()` rejects and leaves the state as it was. Log the user in again, or clear the credentials and call `anchor.sync()`.
- An ID token `parseIdToken` cannot read, such as the empty one of a login without the `openid` scope, fails the read the same way.
- With `localAuthenticationOptions`, the credentials manager asks for the user's biometrics on `getCredentials()`, which every read, token and ending calls; with `biometricPolicy: BiometricPolicy.session` it asks once per `biometricTimeout`, with the default policy on every call.
- The adapter installs no listener, so `dispose()` has nothing to remove.

## What Anchor does not normalize

Logging in (`webAuth.authorize()`, passwordless, passkeys, `auth.passwordRealm()`), saving credentials, `webAuth.clearSession()` and federated logout, refresh-token revocation, MFA, the credentials manager's biometric protection (`localAuthenticationOptions`), DPoP proofs, session transfer (`getSSOCredentials()`), the My Account API and the `Auth0Provider` hook's own state stay with react-native-auth0. Read them through `anchor.native`.

The adapter runs against a fake modelled on react-native-auth0 5.11.1 and against that package's own JavaScript in Node over a replaced native module, never on a device; see the [verification matrix](../verification.md) and [React Native and Expo](../react-native.md). The [package README](https://github.com/priemskiyyy/anchor/tree/main/packages/adapters/auth0-react-native#readme) is the reference.
