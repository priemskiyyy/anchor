# Session Lab, an Anchor example in React

The Session Lab puts Harbor, a small team notes app, beside what Anchor sees of it. Harbor's screens come from `useSession()` alone. Every provider in the picker is the real adapter from [`packages/adapters`](../../packages/adapters), running over an in-page simulation of that provider's SDK, and every simulation shares one made-up world: two people, two organizations, the sessions each provider's server holds, and Harbor's own API. Nothing leaves your browser.

```sh
pnpm install
pnpm build
pnpm --filter example-react dev
```

The packages are linked from the workspace, so build them first.

## What is on the page

- **The top bar**: the provider picker, Tours and Reset. Picking a provider builds a new Anchor over that adapter; the world stays, so the person signed in stays too.
- **Your app**: Harbor in each state of `useSession()`. `initializing` is Restoring your session. `signed-out` is the sign-in card, whose Continue as Ada and Continue as Grace call the provider's own sign-in. `action-required` is Finish setting up two-factor. `unavailable` is We can't reach the sign-in service, whose Retry calls `anchor.sync()`. `signed-in` shows the person, an organization switcher, the projects from Harbor's API (sent with `session.getToken("api")`, or the session cookie when the provider mints no tokens), Load slowly, and Sign out, which says in plain words what the ending proved and links the provider's logout page when it hands one back.
- **What Anchor sees**: the session card (status, key, generation, authority, subject), which flashes and says why when the key changes; the work in flight; how many calls went into the provider's SDK; a plain-English line per diagnostics event; and the real devtools in the corner.
- **Make the provider misbehave**: eight things a real SDK does. Sign in as someone else in another tab, End the session on the server, Offline, Slow provider, Send a duplicate event, Send a stale callback, Require two-factor and Sign out partially. The provider's catalog entry decides which are possible; the others stay disabled and say why. After each one, a notice on its card names the guarantee Anchor kept.
- **Tours**: six guided tours of three to five steps. Each step acts on the lab and highlights what changed; Next waits until it has.

| Tour                                                   | What it shows                                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Work belongs to its session                            | A token in flight when the person changes is rejected, and the late token is discarded.               |
| A failure is never a logout                            | Offline, Harbor is unavailable or keeps its session, never signed out, and Retry recovers.            |
| The key changes exactly when the security context does | A rename keeps the key; another organization or another person gets a new one.                        |
| Ending means this session                              | Sign out says what it proved, a partial ending what it could not, and a logout page finishes the job. |
| One app, any provider                                  | The same Harbor over Firebase, Supabase, Auth0, Better Auth and your own backend.                     |
| Diagnostics are passive                                | Opening the devtools and showing their values never calls the provider.                               |

## The providers

| Provider     | Adapter                           | Simulated SDK                                            | Changes | Credential    | Organizations   | Logout page |
| ------------ | --------------------------------- | -------------------------------------------------------- | ------- | ------------- | --------------- | ----------- |
| Firebase     | `@priemskiyyy/anchor-firebase`    | firebase 12.19.0, the modular Auth instance              | pushed  | ID token      | no              | no          |
| Supabase     | `@priemskiyyy/anchor-supabase`    | supabase-js 2.117.1                                      | pushed  | access token  | no              | no          |
| Auth0        | `@priemskiyyy/anchor-auth0`       | auth0-spa-js 2.27.0                                      | read    | access token  | yes             | yes         |
| Better Auth  | `@priemskiyyy/anchor-better-auth` | better-auth 1.7.6, the vanilla client with organizations | pushed  | cookie        | yes             | no          |
| OIDC         | `@priemskiyyy/anchor-oidc`        | oidc-client-ts 3.5.0, the UserManager                    | pushed  | access token  | yes             | yes         |
| Keycloak     | `@priemskiyyy/anchor-keycloak`    | keycloak-js 26.2.4                                       | pushed  | access token  | yes             | yes         |
| Okta         | `@priemskiyyy/anchor-okta`        | okta-auth-js 8.0.1                                       | pushed  | access token  | no              | yes         |
| MSAL         | `@priemskiyyy/anchor-msal`        | @azure/msal-browser 5.22.0, the PublicClientApplication  | pushed  | access token  | yes, as tenants | no          |
| Amplify      | `@priemskiyyy/anchor-amplify`     | aws-amplify 6.20.0, the auth functions and the Hub       | pushed  | access token  | no              | no          |
| Clerk        | `@priemskiyyy/anchor-clerk`       | clerk-js 6.32.1, the Clerk instance                      | pushed  | session token | yes             | no          |
| WorkOS       | `@priemskiyyy/anchor-workos`      | authkit-js 0.20.2, the client createClient() returns     | pushed  | access token  | yes             | no          |
| Your backend | `@priemskiyyy/anchor-http`        | your own API client                                      | read    | access token  | yes             | no          |

A provider is one more entry in `../shared/providers/constants/catalog.ts`. Its capabilities decide what the lab enables and says, and its `create` builds the simulated SDK and the real adapter over the shared world. Auth.js is not in the catalog: its adapter reads `{basePath}/session` with the global `fetch`, and simulating that would mean patching the global `fetch`, which an example should never teach.

## How it fits together

| File                                             | Role                                                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `src/main.tsx`                                   | Creates the lab once, outside React, with `visibility()`, `online()` and `crossTab()` from `@priemskiyyy/anchor-browser`, and renders it. |
| `../shared/world/createLabWorld.ts`              | The one world: people, organizations, server sessions, what each SDK holds in this browser, the tokens minted, and Harbor's API.          |
| `../shared/providers/`                           | One folder per provider: its simulated SDK, and its real adapter built over it.                                                           |
| `../shared/harbor/createHarborApp.ts`            | Harbor itself: sign-in, organizations, renames, projects cached under their session key, and sign-out.                                    |
| `../shared/lab/createSessionLab.ts`              | The lab: the current Anchor, the timeline, the misbehaviors, their notices and the tours. Picking a provider or a reload is a new Anchor. |
| `../shared/lab/constants/tours/`                 | The tours as data: each step's words, what it does, and when it is skipped for a provider.                                                |
| `src/Application.tsx`                            | Publishes the current Anchor with `AnchorProvider` and lays out the page; the hooks and the devtools follow the Anchor when it changes.   |
| `src/components/Harbor/`                         | Harbor's screens, one per state of `useSession()`.                                                                                        |
| `src/components/Inspector/`                      | What Anchor sees: the session card, the work in flight, the call counter and the timeline.                                                |
| `src/components/Misbehave/`, `Tour/`, `Notices/` | The misbehave panel, the tours and the lab's own notices.                                                                                 |
| `src/utils/createDevtoolsControls.ts`            | Lets the diagnostics tour press the devtools' own buttons in their shadow root.                                                           |
| `src/Application.test.tsx`                       | The lab driven through its UI in jsdom.                                                                                                   |

Styling is Tailwind with the `class-variance-authority` recipes in `../shared/ui/`, shared with every other example, and icons come from Phosphor.

## Using a real provider

Pass the real SDK where the simulation goes, such as `firebase({ sdk: getAuth(app), tokens: { api: idToken() } })`, and Harbor stays as it is: it only reads `useSession()` and calls `session.getToken("api")` and `session.end()`.

## Tests

`pnpm vitest run --project example-react` drives the lab through its UI in jsdom, on fake timers for the three-second provider: every state of Harbor, switching providers, what each provider disables and why, the key-change explanations, each misbehavior, every tour to its end over at least two providers, and the devtools in their shadow root. `pnpm vitest run --project example-shared` tests the world, the simulations, Harbor, the lab and the wording, including one conformance check per provider.

`pnpm test:examples` builds the packages and drives the built pages in Chromium with Playwright (`../lab.spec.ts` and `../frameworks.spec.ts`): the lab at 375 and 1280 px with no page errors and no horizontal scroll, the work tour to its end over Firebase and Better Auth, and the devtools in an open shadow root, hiding the principal until Show values. It is not part of `pnpm check`.
