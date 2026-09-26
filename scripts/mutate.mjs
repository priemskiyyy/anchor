// Mutation checks require a green baseline and restore every changed file.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const MUTANTS = [
  {
    file: "packages/core/src/utils/internal/runtime/SessionRuntime.ts",
    find: "const current = read.revision > this.#committed;",
    replace: "const current = true;",
    describes: "a read overwriting a newer observation (the commit rule)",
  },
  {
    file: "packages/core/src/utils/internal/runtime/SessionRuntime.ts",
    find: 'if (result !== null && result.local === "completed") {',
    replace: 'if (result !== null && result.local !== "not-applicable") {',
    describes: "an ending that proved nothing locally taken for a sign-out",
  },
  {
    file: "packages/core/src/utils/internal/runtime/SessionRuntime.ts",
    find: 'if (phase.phase !== "OPEN" || revision < this.#committed) {',
    replace: 'if (phase.phase !== "OPEN") {',
    describes:
      "a newer push a listener made overwritten by the older answer it interrupted",
  },
  {
    file: "packages/core/src/utils/internal/runtime/SessionRuntime.ts",
    find: 'if (this.#phase.phase === "OPENING" || this.#activeRead !== null) {',
    replace: 'if (this.#phase.phase === "OPENING") {',
    describes:
      "a second read beside the running one, which dispose never aborts",
  },
  {
    file: "packages/core/src/utils/internal/answers/getSecurityContextFingerprint.ts",
    find: "    guest,\n    impersonated,\n  ]);",
    replace: "    guest,\n  ]);",
    describes: "an impersonation keeping the user's session key",
  },
  {
    file: "packages/core/src/utils/internal/answers/getSecurityContextFingerprint.ts",
    find: "    principal.tenant,\n",
    replace: "",
    describes: "another tenant keeping the session key",
  },
  {
    file: "packages/core/src/utils/internal/sessions/SessionRecord.ts",
    find: "const requestKey = JSON.stringify([profile, forceRefresh]);",
    replace: "const requestKey = JSON.stringify([profile]);",
    describes:
      "a forced refresh joining a request that may answer a cached token",
  },
  {
    file: "packages/core/src/utils/internal/sessions/SessionRecord.ts",
    find: "    const refusal = this.#getSessionRefusal();\n\n    if (refusal !== null) {\n      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_DISCARDED",
    replace:
      "    const refusal = null;\n\n    if (refusal !== null) {\n      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_DISCARDED",
    describes:
      "a token that resolved after its session ended delivered to the old session's work",
  },
  {
    file: "packages/core/src/utils/internal/sessions/SessionRecord.ts",
    find: "      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_RECEIVED, {\n        profile,\n        forceRefresh,\n      });",
    replace:
      "      this.#recordEvent(DIAGNOSTIC_TYPES.TOKEN_RECEIVED, {\n        profile,\n        forceRefresh,\n        value: accepted.value,\n      });",
    describes: "a token's value reaching diagnostics (release gate 5)",
  },
  {
    file: "packages/core/src/utils/internal/answers/parseSessionAnswer.ts",
    find: 'if (typeof guest !== "boolean" || typeof impersonated !== "boolean") {',
    replace: "if (false) {",
    describes: "an answer without its guest and impersonated flags accepted",
  },
  {
    file: "packages/core/src/utils/common/copyFrozen.ts",
    find: "return Object.freeze(copied);",
    replace: "return copied;",
    describes: "published user data left mutable",
  },
  {
    file: "packages/adapters/firebase/src/utils/getSessionIdToken.ts",
    find: "if (user === null || !isSessionUser(user, session)) {",
    replace: "if (user === null) {",
    describes: "another Firebase user's ID token delivered to the session",
  },
  {
    file: "packages/adapters/supabase/src/utils/constants/supabase.ts",
    find: 'Object.freeze({ scope: "local" })',
    replace: 'Object.freeze({ scope: "global" })',
    describes: "a sign-out ending the user's sessions on every device",
  },
  {
    file: "packages/adapters/better-auth/src/utils/isSessionUser.ts",
    find: "  data.user.id === principal.subject &&\n",
    replace: "",
    describes: "an ending signing out another user's Better Auth session",
  },
  {
    file: "packages/adapters/better-auth/src/utils/isAnsweredSessionState.ts",
    find: "(value.error === null || isUnauthorizedError(value.error))",
    replace: "true",
    describes: "a failed fetch's stale data published as the session",
  },
  {
    file: "packages/adapters/http/src/utils/getSessionToken.ts",
    find: "if (subject !== principal.subject) {",
    replace: "if (false) {",
    describes:
      "a backend token minted for whoever is signed in now delivered to another session",
  },
  {
    file: "packages/adapters/auth0-react-native/src/utils/getSessionAccessToken.ts",
    find: "if (forceRefresh || !caches.isOwnedBy(cache, login)) {",
    replace: "if (forceRefresh) {",
    describes: "an API token another login cached answered to the next one",
  },
  {
    file: "packages/browser/src/crossTab.ts",
    find: "channel.postMessage(INVALIDATION_MESSAGE);",
    replace: "channel.postMessage(session.get());",
    describes:
      "a tab telling other tabs who is signed in instead of asking them to read",
  },
  {
    file: "packages/server/src/getSessionHydration.ts",
    find: '  if (state.status === "unavailable") {\n    return UNAVAILABLE_HYDRATION;\n  }\n',
    replace: "",
    describes: "a request that could not be read hydrated as signed out",
  },
  {
    file: "packages/server/src/getRequestSession.ts",
    find: "    headers: new Headers(responseHeaders),\n",
    replace:
      '    headers: anchor.session.get().status === "unavailable" ? new Headers() : new Headers(responseHeaders),\n',
    describes:
      "a cookie the provider rotated before its read failed lost from the response",
  },
];

// The package manager prints its own banner to stdout before the reporter
// does, so the report starts at the first brace rather than at the first byte.
const countFailures = (text) => {
  const start = text.indexOf('{"numTotalTestSuites"');

  if (start === -1) {
    return -1;
  }

  try {
    return JSON.parse(text.slice(start)).numFailedTests ?? -1;
  } catch {
    return -1;
  }
};

// A package's Vitest project is named after its directory.
const getProject = (file) =>
  /^packages\/(?:adapters\/)?([^/]+)\//.exec(file)?.[1] ?? "core";

const getFailingTests = (project) => {
  try {
    return countFailures(
      execFileSync(
        "node_modules/.bin/vitest",
        ["run", "--project", project, "--reporter", "json"],
        { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
      ),
    );
  } catch (error) {
    // A non-zero exit is the normal case for a caught mutant, so the report on
    // stdout still decides. Only an unparseable report is a runner failure.
    return countFailures(String(error.stdout ?? ""));
  }
};

for (const project of new Set(MUTANTS.map(({ file }) => getProject(file)))) {
  const baseline = getFailingTests(project);

  if (baseline === 0) {
    continue;
  }

  console.error(
    `The ${project} baseline is not green (${baseline} failing). A mutation ` +
      `run against a red baseline proves nothing. Fix the suite first.`,
  );
  process.exit(1);
}

console.log("Baseline green. Running mutants.\n");

let caught = 0;
const survivors = [];

for (const mutant of MUTANTS) {
  const path = new URL(mutant.file, `file://${root}`);
  const original = readFileSync(path, "utf8");

  if (!original.includes(mutant.find)) {
    console.error(
      `Mutant is stale, its target text is gone: ${mutant.describes}`,
    );
    process.exit(1);
  }

  try {
    writeFileSync(path, original.replace(mutant.find, mutant.replace));

    const failed = getFailingTests(getProject(mutant.file));

    if (failed <= 0) {
      survivors.push(mutant.describes);
      console.log(`SURVIVED ${mutant.describes}`);
      continue;
    }

    caught += 1;
    console.log(`caught   ${mutant.describes} (${failed} tests went red)`);
  } finally {
    writeFileSync(path, original);
  }
}

console.log(`\n${caught} of ${MUTANTS.length} mutants caught.`);

if (survivors.length > 0) {
  console.error("\nSurvivors, each either a missing test or dead code:");

  for (const survivor of survivors) {
    console.error(`  ${survivor}`);
  }

  process.exit(1);
}
