# Contributing

Use Node 22.18 or newer and the pnpm version in `package.json`. Run `pnpm install --frozen-lockfile`, then `pnpm check` before submitting a change, and read its output. `pnpm check` builds every package, then runs TypeScript, ESLint, the lint-rule probes and the inferred-`any` scan, Prettier and the unit tests.

## Layout

- `packages/core`: the runtime, published as `@priemskiyyy/anchor` with the `./mock` and `./testing` subpaths.
- `packages/adapters/*`: one package per provider SDK API, published as `@priemskiyyy/anchor-<name>`. A React Native SDK with a different API gets its own package whose factory keeps the provider's name. Packages share nothing privately.
- `packages/react`, `packages/vue`, `packages/solid`, `packages/svelte`: the bindings, one surface in each framework's own idiom.
- `packages/devtools`: the in-page inspector, with one thin wrapper per binding.
- `examples/*`: the Session Lab, one mock-powered lab of the races Anchor handles, for every binding.
- `docs/`: the VitePress site.
- `scripts/`: the repository checks. `verify-lint-rules.mjs` lints probes with the real ESLint config and proves every rule in both directions; `verify-no-any.mjs` fails on a binding that infers `any`.

Runtime owners and helpers live in `src/utils/`, shared helpers in `src/utils/common/`, constants in `src/utils/constants/<topic>.ts` as UPPER_SNAKE values, and public types in `src/types/`, one type per file. Internal contracts belong in each folder's `internal/` directory, so `src/types/internal/` holds the types no consumer sees and `src/utils/internal/<topic>/` the machinery no consumer may import. The core's mock adapter lives in `src/mock/` and its conformance suite in `src/testing/`. Typecheck-only expectations sit beside their sources as `*.contracts.ts`, and `tests/types/` holds the consumer-view type tests that the root `tsc` checks.

Package roots export the supported public API explicitly, one export per file and no `export *`, and no other file is a barrel. The entry points are `src/index.ts`, the core's `src/mock.ts` and `src/testing.ts`, and the devtools wrappers `react`, `vue`, `solid` and `svelte`. `src/index.test.ts` pins each entry's runtime names with `Object.keys`.

Every `exports` entry is `types`, then `import`, then `default`, with `import` and `default` on the same ESM file, because React Native consumers run Jest, which needs a resolvable condition. The Svelte binding alone uses `types` then `svelte`. Every package is version `0.1.0` under the MIT license, and the core has zero runtime dependencies.

## Code

ESLint enforces every rule it can check, and `pnpm test:lint` proves each one with a probe it must reject and, where a rule has exceptions, one it must allow. Change a rule and its probes together.

- **ESLint** (the siblings' rules): `type` over `interface`, no `enum`, `switch`, `any`, `as` (including `as const`), angle-bracket assertions, non-null `!`, `void` operator, `??=`, `||=`, `&&=`, `readonly` in any form (`Readonly<>`, `readonly T[]`, readonly fields and mapped modifiers), `export *`, relative imports, or re-exports outside `index.ts`, `mock.ts` and `testing.ts`; `curly: all`; `no-else-return`; `consistent-type-imports`; no inline ESLint configuration; and the blank-line rule around declarations, blocks and returns. Every restriction carries a message naming the alternative. `react-hooks` recommended rules on React files; Vue and Svelte plugins on theirs.
- **Comments**: none, except a provider quirk or a workaround the code cannot say, in one line. No narration and no design-log references in code. Public exports (the runtime values each entry point exports, the members of `Anchor`, adapter factories and profile helpers, binding components and hooks, the devtools class, and every type an entry point exports) carry a JSDoc of one or two sentences and an `@example`; a field of a public type whose contract its name cannot say carries a one-line JSDoc. A constant in `utils/constants/` carries a one-line JSDoc naming the fact it encodes. Other internal types, internals and tests carry none. A test's `@ts-expect-error` states its reason.
- **Code**: early returns and no `else` after a return; guard, then work: a function or loop body never ends with an `if` block that wraps its work, but guards with `if (!condition) { return; }` (or `continue` in a loop) and does the work after it, as ESLint enforces; `typeof x === "function"` guards; exhaustive union dispatch closed by `assertUnreachable`, or a `satisfies Record<...>` table for a pure mapping; helpers named for exactly what they return or do, never with a vague verb (`getCurrentSession`, not `readSession`; `parseSessionAnswer`, not `readAnswer`), a one-line helper with one caller inlined; handlers named `handle*`; arrow functions exported one per file; classes only for stateful owners, with `#private` fields, public members as arrow fields and private helpers as `#method()`; no default exports; no module-level mutable state; no `process.env`; `src/...` imports inside a package; grouped options; published data frozen at runtime; one `.flatMap()` with early returns (`return []` to skip, `return [value]` to keep) instead of `.filter().map()` or `.map().filter()`. No generic guard helpers (`isRecord`, `isThenable`, `isPromiseLike`, `isObject` and the like): they claim a type they cannot prove. Trust the declared type where the type is the contract (options, adapter answers, SDK returns), and contain the failure when a caller breaks it. Where a genuine runtime boundary needs a check, write the precise one the case needs: `isPlainObject` for data being copied, a comparison on the discriminant, `Array.isArray`, or assimilating a possible promise through `new Promise((resolve) => resolve(value))` inside a `try`.
- **Data**: a lifecycle discriminates on `state`, an answer or outcome on `status`, a payload on `kind`. Public discriminant values are lowercase, multiword ones kebab. Internal state machines use `UPPER_CASE` states. Error codes are UPPER_SNAKE. Published data uses `T | null` for an absent value; inputs use optional fields. Identifiers live in their object: `session: { key }`, `adapter: { name }`. Time is a `number` of epoch milliseconds named `timestamp`. Durations are milliseconds with no suffix. Published data is frozen at runtime. Types carry no `readonly`.
- **Tests**: `<Source>.test.ts` beside the source, flat `test()` calls named as the invariant they guard, `globals: false`, no `describe` outside the two conformance suites, assertions on specific values and call arguments, fake timers only for time-based rules with `vi.useRealTimers()` in `afterEach`, interleaving by reentrancy and held mock calls, never by sleeping. A new test is watched failing before it is trusted.
- **Prose**: keep sentences concise and use commas, colons or separate sentences instead of em dashes.
- **Carve-outs**, each with a one-line comment and nothing wider: the `Register` interfaces; relative imports in the Svelte binding; the one `describe` in `testSessionAdapter` and the one in `testServerSessionAdapter`; method syntax on `*Like` members that need bivariance; the overload pair of `copyFrozen`, whose copy keeps the type of what it copies, as Switchboard's `normalizeContext` does; the overloads of each binding's `useSession`, whose return type depends on whether a selector is given, as Silo's framework `useValue`; and the overload pair of each adapter factory, whose user type depends on whether a `user` mapper is given, as Silo's `value`.

Anchor never throws into its host at runtime. The only synchronous throws are `AnchorError` `INVALID_CONFIGURATION` from the constructor, a binding hook outside its provider, and mounting the devtools twice or on an element that cannot host a shadow root. Every operation rejects with an `AnchorError` code, every adapter call and listener is contained, and a failure becomes a rejection, a state or a diagnostic.

## Adapters

An adapter is a plain `{ name, native, tokens, open }`, and `open` returns a session with `read` and, where the provider supports them, `getToken`, `end` and `dispose`. It translates one provider SDK onto the contract and nothing more. The rules:

1. **The factory is cold.** Creating the adapter reads nothing, subscribes to nothing and calls nothing. It may run at module scope and on a server.
2. **Take the SDK the application set up.** The option is `sdk`, typed structurally as `<Name>Like`, naming only what the adapter calls. Never import the provider at runtime, never initialize, load or close it. A typecheck-only `<name>.contracts.ts` assigns the real SDK to the structural type, proves `native` keeps the real type, and refuses a wrong object with `@ts-expect-error`.
3. **`open` is synchronous.** It installs the provider's listeners and returns the session. Readiness is awaited inside `read`. It may push from inside `open`.
4. **Report what the provider proves.** `signed-out` only when the provider positively says there is no session; a provider that cannot tell throws from `read`. A pending or blocked session is `action-required` with the provider's step as `action.kind`.
5. **Map users to plain data.** The default user is a plain snapshot of the provider's user fields under the provider's own names; an optional `user` mapper types `TUser`. Never hand the core an SDK object.
6. **Identity is complete and deterministic.** `principal.authority` names the issuer, `subject` the provider's stable user id, `tenant` the provider's tenant partition or `null`. `context` fingerprints everything else that changes permissions: organization, provider session, impersonator.
7. **Push when the provider says something changed.** A complete answer goes through `observer.session`; a change the adapter can only notice goes through `observer.invalidate()`. An adapter whose provider emits nothing observes nothing, and its README says to call `anchor.sync()` after native calls.
8. **Bind every operation to the session it names.** `getToken` mints only for the request's session and throws `AnchorError` `SESSION_CHANGED` when the SDK now holds another identity. `end` ends only the request's session and answers `not-applicable` when the SDK no longer holds it. Where the SDK can target a session, it does.
9. **End only the current session.** Choose the SDK's narrowest sign-out explicitly, never its broader default. Report what was proven: `local`, `remote`, and a `navigation` URL when the provider needs a page visit to finish.
10. **Answer, do not guess.** A `forceRefresh` the SDK cannot honor throws `UNSUPPORTED`. A provider "login required" throws `INTERACTION_REQUIRED`. Any other failure throws what the SDK threw.
11. **Silence after dispose.** `dispose` removes every listener the adapter installed.
12. **Types before runtime checks.** What the types enforce is not checked again at runtime. The adapter does only the work its provider needs.
13. **Methods of `<Name>Like` use property syntax.** Method syntax only on a member that needs parameter bivariance, with the one-line reason "A method, so that ...".

Every adapter package has this layout:

```text
packages/adapters/<name>/
  LICENSE  README.md  package.json  tsconfig.json  tsdown.config.ts
  src/index.ts                     the factory, the profile helpers and the public types, nothing else
  src/<name>.ts                    the factory alone; every helper with logic lives in src/utils/
  src/<name>.test.ts               mapping, identity, binding, ending, coldness, native
  src/<name>.contracts.ts          typecheck only, against the real SDK
  src/<name>.sdk.test.ts           the real SDK in Node or jsdom, where it runs there
  src/conformance.test.ts          testSessionAdapter
  src/index.test.ts                expect(Object.keys(api)).toEqual([...])
  src/fake<Sdk>.fixture.ts         an in-process fake modelled on a named SDK version
  src/types/<Name>AdapterOptions.ts
  src/types/<Name>Like.ts
  src/utils/constants/<topic>.ts   provider names and fixed values, UPPER_SNAKE, each with a one-line JSDoc
  src/utils/<helper>.ts            one arrow per file, named for what it returns or does, with its test beside it
```

Its `package.json` has no `dependencies`: the core is a peer at `>=0.1.0 <0.2` plus a `workspace:*` dev dependency, and the provider SDK is an optional peer, pinned exactly only as a root dev dependency. It sets `sideEffects: false`, the description "<Provider> sessions for Anchor: <what the adapter observes and mints>, over the <sdk> you inject.", and the keywords provider, platform, then `typescript`, `anchor`, `adapter`. Its README has, in order: `# @priemskiyyy/anchor-<name>`, one paragraph, Installation, Create an Anchor, Options (table), Capabilities (table), How a session is mapped (table), Tokens, Ending the session, What Anchor does not normalize, Behavior, Tests (what ran and what did not), License.

## Testing

`pnpm test:unit` runs one Vitest project per package, each with a `src` alias onto its own source. Every folder under `packages/adapters` with a `package.json` is a project without being listed, and the bindings, devtools and examples join once their `package.json` exists. Adapter and binding tests import the core by its package name, so run `pnpm build` first.

A new test is watched failing once before it is trusted. When the implementation came first, break it on purpose and confirm the test goes red. A bare `toHaveBeenCalled()` is not an assertion; assert the calls with their arguments. A `@ts-expect-error <reason>` suppresses only the next line, so on a multi-line literal it sits on the line where the error is reported; TS2578 is a failing negative case, and a negative case counts only when the whole file compiles to exit 0. Assert the property, never a bound on it, and never through a call that returns `any` (`Reflect.apply`, `JSON.parse`): call directly with `@ts-expect-error <reason>`. A fake that does not implement the behavior under test makes that test vacuous.

## Documentation

Documentation examples must compile against the current API. Use commas, colons or separate sentences instead of em dashes.
