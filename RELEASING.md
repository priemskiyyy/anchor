# Releasing the packages

All packages share one version line. Each has its own GitHub release tag, and one publishing workflow serves them all. Pushes and verification runs publish nothing.

The release tag uses the package name without its scope: `<name>-v<version>`, for example `anchor-supabase-v0.1.0` for `@priemskiyyy/anchor-supabase`. The publish workflow resolves the package from the tag, verifies its metadata and changelog entry, runs the test workflows, and publishes the verified tarball from `.artifacts/release/<package>/` with provenance after checking its checksum. It publishes the tarball that was tested, not a rebuild. Prereleases use the `next` dist-tag, and stable releases use `latest`.

Publish `@priemskiyyy/anchor` first, then `@priemskiyyy/anchor-server`, which every `-node` adapter peers on, then the adapters and the hints, `@priemskiyyy/anchor-browser` and `@priemskiyyy/anchor-react-native`, then the bindings, `@priemskiyyy/anchor-react`, `-vue`, `-solid` and `-svelte`, then `@priemskiyyy/anchor-devtools`, which peers on all four. Dependents declare the matching minor as a peer dependency, so a dependent published before the core cannot be installed.

## Prepare a release

1. Update the package versions and their entries in `CHANGELOG.md` together. Date the entries, because `Unreleased` blocks publishing. An entry's heading is `## <package> <version> - <date>`, and `verify:release` parses it literally.
2. Run `pnpm check:release`. It needs no Docker, no credentials and no browser.
3. Merge into `main` and check GitHub Actions on that revision.
4. Create a GitHub release with the package's tag. Mark prerelease versions as prereleases.
5. Approve the publish job in the GitHub `npm` environment once its verification jobs pass.

Do not reuse a published version. Prepare a new patch version and changelog entry for a release fix.

## What the release checks do not cover

No adapter is run against its provider's real service or on a device, in continuous integration or anywhere else in this repository: the real SDKs that run here run in Node or jsdom with no network, or against an in-process server. See the [verification matrix](docs/verification.md). Before a stable release of an adapter, run it once by hand in a real application against a real project of that provider, and say in the release notes what you ran.

## npm trusted publishers

All packages use the GitHub owner `priemskiyyy`, repository `anchor`, workflow `publish.yml` and environment `npm`. Trusted publishing uses GitHub's short-lived OIDC identity, so the repository needs no npm token.

The first publication of a new package requires an authenticated npm maintainer, because the package must exist before its trusted publisher can be configured. Publish the verified tarball from its artifact directory, then register the workflow. Do not create a GitHub release for that same version afterward.

```sh
npm login
cd .artifacts/release/@priemskiyyy/anchor
shasum -a 256 -c SHA256SUMS
npm publish priemskiyyy-anchor-<version>.tgz --access public --tag next
```

The initial 0.1.0 packages are previews. Publish them under `next`, inspect the resulting dist-tags, and keep their verification limits in the package READMEs. The first publication can also acquire a `latest` alias, so the tag alone does not communicate preview status.
