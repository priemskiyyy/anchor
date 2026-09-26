# Session Lab on Expo

Harbor from the [React example](../react/README.md), rebuilt on React Native with [`@priemskiyyy/anchor-react`](../../packages/react), the same provider and hooks the web uses: there is no separate React Native binding. It is the same app over the same provider catalog from `example-shared`, each provider the real adapter over its simulated SDK, with the session card and the misbehave list below it. It installs `appState({ sdk: AppState })` from [`@priemskiyyy/anchor-react-native`](../../packages/react-native), so returning to the foreground reads the provider again.

```sh
pnpm install
pnpm build
pnpm --filter example-expo dev
```

The packages are linked from the workspace, so build them first.

## How it fits together

| File                            | Role                                                                                                                 |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `index.tsx`                     | Creates the lab once, outside React, with the foreground hint, and registers the root.                               |
| `src/Application.tsx`           | Publishes the current Anchor with `AnchorProvider`; the hooks follow it when the provider changes or Harbor reloads. |
| `src/components/Harbor/`        | Harbor's screens, one per state of `useSession()`, in React Native's own primitives.                                 |
| `src/components/Lab/`           | The provider picker, the session card and the misbehave list.                                                        |
| `src/utils/constants/colors.ts` | Each tone's color, since React Native has no Tailwind classes.                                                       |

This example has no tours, timeline or devtools: the devtools render in a web page's shadow root, and the React example carries all three.

## Tests

None: Expo is typechecked (`pnpm --filter example-expo lint:typescript`) and bundled for the web (`pnpm --filter example-expo build`, which runs `expo export --platform web`), and never run on a device or in `pnpm check`. `build:native` bundles iOS and Android too.
