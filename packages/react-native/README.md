# @priemskiyyy/anchor-react-native

The React Native lifecycle hint for Anchor: read the session again each time the app returns to the foreground. Foregrounding is a reason to read, never proof that the session is valid, and nothing refreshes in the background: your provider SDK refreshes its own tokens.

Version 0.1.0 is an initial preview. APIs may change before 1.0. See the [verification limits](https://github.com/priemskiyyy/anchor/blob/main/docs/verification.md) before adopting an adapter.

## Installation

```sh
pnpm add @priemskiyyy/anchor @priemskiyyy/anchor-react-native
```

## Use it

```ts
import { Anchor } from "@priemskiyyy/anchor";
import { appState } from "@priemskiyyy/anchor-react-native";
import { AppState } from "react-native";

export const anchor = new Anchor({
  adapter,
  hints: [appState({ sdk: AppState })],
});
```

Pass React Native's `AppState`; the hint never imports `react-native` itself. `start()` subscribes to `change` and `dispose()` removes the subscription.

## Behavior

- A transition to `active` from `background`, `inactive` or an unknown state reads again. Going to the background or inactive reads nothing, and a repeated `active` report is not a return.
- An app started in the background reads again the first time it comes to the foreground.
- Reads go through Anchor's own read path, so a quick background and foreground costs one read and one queued read at most.
- It works the same on Expo and in bare React Native. Pull to refresh is `anchor.sync()`.

## Tests

The hint runs against a real Anchor over the core's mock adapter and an in-process fake modelled on React Native's `AppState` since 0.65, when `addEventListener` began answering a subscription. The contracts file typechecks React Native 0.86.3's own `AppState` against the structural type. It was not run on a device.

## License

MIT
