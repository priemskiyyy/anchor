# Session Lab on Svelte

Harbor from the [React example](../react/README.md), rebuilt with [`@priemskiyyy/anchor-svelte`](../../packages/svelte) in Svelte's own idiom. It is the same app over the same provider catalog from `example-shared`, each provider the real adapter over its simulated SDK, with the session card, the misbehave list and the devtools beside it. The tours, the work in flight and the timeline live in the React example; here the devtools in the corner carry the timeline.

```sh
pnpm install
pnpm build
pnpm --filter example-svelte dev
```

The packages are linked from the workspace, so build them first. `src/types/Register.d.ts` registers the lab's Anchor once, and every component reads it with `useSession()` and `useAnchor()`, typed with the lab's user and its `api` token profile.

`src/Application.svelte` wraps `<AnchorProvider>` in `{#key}` on the runtime, so picking a provider or reloading Harbor remounts the tree over the new Anchor, as the devtools README asks. `createDevtoolsAttachment()` runs in `src/components/Devtools/AnchorDevtoolsHost.svelte`, a child inside the provider, because it reads the provider's context.

## How it fits together

| File                                    | Role                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/main.ts`                           | Creates the lab once, outside Svelte, mounts the page, and disposes both when the page goes away.      |
| `src/Application.svelte`                | Sets the lab in its context, publishes the current Anchor with `AnchorProvider` and lays out the page. |
| `src/utilities/useObservable.svelte.ts` | Reads one of the lab's own values, such as the runtime or Harbor's view, as state.                     |
| `src/components/Harbor/`                | Harbor's screens, one per state of `useSession()`.                                                     |
| `src/components/Lab/`                   | The top bar, the session card and the misbehave list.                                                  |
| `src/Application.test.ts`               | The lab driven through its UI in jsdom.                                                                |

The world, the providers, Harbor and the lab are the shared ones described in the [React example](../react/README.md#how-it-fits-together).

## Tests

`pnpm vitest run --project example-svelte` drives the lab through its UI in jsdom, on fake timers for the three-second provider: Continue as Ada signs her in through the provider and loads her projects with a token, switching the provider keeps the person under a new key and says why, a slow restore stays on Restoring your session and an unreachable provider is unavailable, never signed out, two-factor keeps the key, what a provider cannot do is disabled with its reason, and the devtools mount in a shadow root of their own. `pnpm test:examples` builds the packages and drives the built page in Chromium with Playwright (`../frameworks.spec.ts`), alongside the other examples.
