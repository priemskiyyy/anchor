# Security

## Supported versions

Security fixes target the latest minor version of each package. The initial 0.1.0 release is a preview; the [verification matrix](docs/verification.md) records its testing limits.

## Reporting a vulnerability

Report vulnerabilities through GitHub's [private vulnerability reporting](https://github.com/priemskiyyy/anchor/security/advisories/new). Include the Anchor package and version, the provider SDK and version, and a minimal reproduction when possible.

Use a private report for credentials or session data that could affect another person. Public issues are suitable for reports that contain no sensitive information.

## Scope

- A token or operation crossing a session boundary.
- A stale session minting a token for or ending another session.
- Credentials, cookies or provider errors leaking through diagnostics or devtools.
- Untrusted session data escaping the documented validation and snapshot boundaries.

Provider sign-in flows, credential storage and authorization remain owned by the provider SDK and the application. Include those details when they are relevant to a reproduction.
