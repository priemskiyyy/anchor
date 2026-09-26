# @priemskiyyy/anchor-supabase-node

Request-scoped Supabase Auth sessions for Anchor's server reads. Each request is read through a `@supabase/ssr` server client created over that request's own cookies, its session verified with Supabase Auth through `auth.getUser()`, and the headers Supabase wants set on the response are handed back with it: the cookies it refreshes or deletes, and the cache headers that go with them. A session maps exactly as [`@priemskiyyy/anchor-supabase`](../supabase) maps it in the browser or on React Native, so one user is one principal on both sides.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-server @priemskiyyy/anchor-supabase-node @supabase/ssr @supabase/supabase-js
```

## Read a request

```ts
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { supabase } from "@priemskiyyy/anchor-supabase-node";
import { createServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./config";

const adapter = supabase({
  sdk: (cookies) =>
    createServerClient(supabaseUrl, supabaseAnonKey, { cookies }),
});

export const handleRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  if (state.status === "unavailable") {
    return new Response("Try again shortly.", { status: 503, headers });
  }

  return new Response(renderPage(state), { headers });
};
```

A `@supabase/ssr` server client belongs to one request: it reads that request's cookies and must never be shared. So `sdk` is the function that creates one, and the adapter calls it once per read with the cookie methods `createServerClient` asks for: `getAll` answers the request's cookies, and `setAll` writes every cookie Supabase sets into the response's headers. Pass any other options you use, such as `cookieOptions` or `auth.flowType`, in the same call.

Pass `headers` on in every branch: Supabase refreshes an expiring session and deletes an ended one through them, and they carry the `Cache-Control: private, no-cache, no-store, must-revalidate, max-age=0`, `Expires` and `Pragma` headers that keep a CDN from serving one user's cookies to another.

## Options

| Option | Type                                         | Default         | What it does                                                                                                   |
| ------ | -------------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------- |
| `sdk`  | `(cookies: SupabaseCookieMethods) => Client` | required        | Creates one request's server client, passing the adapter's cookie methods as `createServerClient`'s `cookies`. |
| `user` | `(user: User) => TUser`                      | the user itself | Maps the Supabase `User` to the plain data a session carries.                                                  |

Use the same `user` mapper as the client adapter, so a page rendered on the server and the Anchor in the browser carry the same user.

## How a session is mapped

As the client adapter maps it: the authority is `supabase`, the subject is `user.id`, the tenant and the context are `null`, `guest` is `user.is_anonymous`, `impersonated` is `false`, and the default user is the Supabase `User` itself. The request's session carries `principal`, `user`, `guest` and `impersonated`; its key, tokens and ending belong to the client's Anchor.

Where the two sides differ: the server answers the user as Supabase Auth holds it now, while the client adapter answers the user its stored session carries, which supabase-js last received at sign-in or at a refresh. They are the same user, and the same data unless it changed since the client's last refresh, such as an `updateUser()` on another device or an administrator's change.

## Verifying the session

Each read calls `auth.getUser()`, which sends the session's access token to Supabase Auth and answers the user it holds, after refreshing the session when its access token expires within 90 seconds. The adapter never trusts `getSession()`, which only decodes the cookie. `getClaims()` verifies the token without a request when your project signs its tokens with an asymmetric key, but it cannot see a session that was ended on the server until its access token expires, and it answers the token's claims rather than the user the client adapter maps; so the adapter pays one request to Supabase Auth per read.

## Behavior

- Each read creates its own server client over the request's own cookies, and holds nothing between requests.
- A request without a session, or with one Supabase Auth no longer holds, is `signed-out`: supabase-js answers `AuthSessionMissingError` for both. So is a session Supabase Auth refuses with `bad_jwt`, `user_not_found`, `user_banned`, `refresh_token_not_found`, `refresh_token_already_used` or `session_expired`. Any other failure, such as a network error, a `5xx` or a rate limit, is `unavailable`, with the error as its `cause`.
- The cookies Supabase sets reach `headers` as `Set-Cookie` headers written as `@supabase/ssr`'s `serializeCookieHeader` writes them, one for each chunk of a session too big for one cookie: a refresh rewrites the chunks that changed, and an ended session deletes every chunk.
- The cookies Supabase writes reach `headers` whatever the read then answers: a read that refreshed the session before Supabase Auth failed it is `unavailable`, and still hands the browser the rotated cookies, since Supabase has spent the old refresh token.
- The factory is cold: creating the adapter creates no client and reads nothing.

## Tests

Unit tests run over an in-process fake modelled on a `@supabase/ssr` 0.12.7 server client over supabase-js 2.117.1, whose `auth.getUser()` reads the session cookie, refreshes and removes sessions through `setAll` and answers the SDK's own error classes. The `testServerSessionAdapter` conformance suite from `@priemskiyyy/anchor-server/testing` runs over the fake and over the real `createServerClient`, whose requests go through `global.fetch` to an in-process fake of Supabase Auth's REST API: the password grant, refresh-token rotation, `/user` and `/logout`. The real server client also reads two users' requests concurrently, refreshes an expired session whose rotated cookie the next request reads with, keeps the rotated cookies of a refresh on the response when Supabase Auth then fails the read, reads a session split into two cookie chunks, deletes both chunks of a session ended elsewhere, and answers `unavailable` when Supabase Auth fails. The parity test runs both real SDKs in-process: the real `createBrowserClient` signs in against the same fake of Supabase Auth, the client adapter reads its session, and this adapter reads the cookies it wrote, answering the same principal, user and flags. Cookie parsing and serialization are compared with `@supabase/ssr`'s own `parseCookieHeader` and `serializeCookieHeader`, and the contracts file typechecks the real `createServerClient`, its cookie methods and `User`. A real Supabase Auth server, `getClaims()`, asymmetric signing keys and the PKCE code exchange were not run.

## License

MIT
