# Getting help

Start with [getting started](docs/getting-started.md), the [errors](docs/errors.md) and the [race conditions and guarantees](docs/race-conditions.md). Each adapter has its own README under [packages/adapters](packages/adapters), with what Anchor does not normalize for that provider, and the [devtools](docs/devtools.md) show what happened to the session and every operation.

For a bug report, include:

- The smallest example that reproduces the issue, ideally over the mock adapter from `@priemskiyyy/anchor/mock`.
- Anchor, adapter, provider SDK, framework and runtime versions, and the platform: browser, Node, React Native or Expo.
- The Anchor options involved: the adapter and its options, `timeout` and any `hints`.
- The state from `anchor.session.get()`, and the `code` of any `AnchorError`, with its `cause` when the provider's own error explains it.
- The snapshot from `anchor.diagnostics.get()` and the devtools timeline or `anchor.diagnostics.events` around the problem.
- Whether it happens before `start()`, across a sign-in, a sign-out or a switch of account or organization, during `getToken()` or `end()`, or after `dispose()`.

Use [GitHub issues](https://github.com/priemskiyyy/anchor/issues) for reproducible bugs and feature requests. Remove tokens, cookies, credentials and personal data from examples and logs. Diagnostics and the devtools timeline carry no token, user data or provider error, and the principal only once values are shown, so they are safe to share as they are.

If the provider's SDK itself reports a different session than you expect, check first whether it does so without Anchor: signing in, refreshing and persisting a session are the SDK's.

See [CONTRIBUTING.md](CONTRIBUTING.md) to run the test suites or propose a change.
