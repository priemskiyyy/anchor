import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { publint } from "publint";
import { formatMessage } from "publint/utils";
import ts from "typescript";

// Checks every package the way a consumer receives it: its package.json
// against the templates in CONTRIBUTING.md, then the tarball npm packs, linted
// by publint, installed into a throwaway consumer beside the peers the
// workspace pins, typechecked through every entry point, run under Vitest and
// under plain Node. Every problem is reported before it fails, and the release
// artifacts are staged only when there is none.

const workspace = fileURLToPath(new URL("..", import.meta.url));
const release = path.join(workspace, ".artifacts", "release");

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const readTextIfExists = (file) =>
  existsSync(file) ? readFileSync(file, "utf8") : "";

const rootManifest = readJson(path.join(workspace, "package.json"));
const rootLicense = readFileSync(path.join(workspace, "LICENSE"), "utf8");

const coreManifest = readJson(
  path.join(workspace, "packages/core/package.json"),
);

const CORE = "@priemskiyyy/anchor";
const SVELTE = "@priemskiyyy/anchor-svelte";
const REPOSITORY = "git+https://github.com/priemskiyyy/anchor.git";
const BUGS = "https://github.com/priemskiyyy/anchor/issues";
const HOMEPAGE = "https://priemskiyyy.github.io/anchor/";
const FILES = ["dist", "README.md", "LICENSE"];
const EM_DASH = String.fromCodePoint(0x2014);

// svelte-package copies every source into dist, tests included, so the Svelte
// binding publishes dist without them.
const SVELTE_FILES = [
  "dist",
  "!dist/**/*.test.*",
  "!dist/**/*.fixture.*",
  "!dist/**/*.contracts.*",
  "README.md",
  "LICENSE",
];

const [coreMajor, coreMinor] = coreManifest.version.split(".").map(Number);

// Dependents peer on the matching minor, so one published before the core
// cannot be installed (RELEASING.md).
const WORKSPACE_PEER_RANGE = `>=${coreMajor}.${coreMinor}.0 <${coreMajor}.${coreMinor + 1}`;

// Every other peer range is a lower and an upper bound, as `>=1.2.0 <2`.
const PEER_RANGE = /^>=(\d+\.\d+\.\d+) <(\d+(?:\.\d+){0,2})$/;
const EXACT_VERSION = /^\d+\.\d+\.\d+$/;

// Every entry point and the runtime names it exports, as each package's
// src/index.test.ts pins them. A package's exports must list exactly these.
const SURFACES = {
  "@priemskiyyy/anchor": ["Anchor", "AnchorError"],
  "@priemskiyyy/anchor/mock": ["createMockAdapter"],
  "@priemskiyyy/anchor/testing": ["testSessionAdapter"],
  "@priemskiyyy/anchor-browser": ["crossTab", "online", "visibility"],
  "@priemskiyyy/anchor-devtools": ["AnchorDevtools"],
  "@priemskiyyy/anchor-devtools/react": ["AnchorDevtools"],
  "@priemskiyyy/anchor-devtools/vue": ["AnchorDevtools"],
  "@priemskiyyy/anchor-devtools/solid": ["AnchorDevtools"],
  "@priemskiyyy/anchor-devtools/svelte": ["createDevtoolsAttachment"],
  "@priemskiyyy/anchor-react": ["AnchorProvider", "useAnchor", "useSession"],
  "@priemskiyyy/anchor-react-native": ["appState"],
  "@priemskiyyy/anchor-server": ["getRequestSession", "getSessionHydration"],
  "@priemskiyyy/anchor-server/testing": ["testServerSessionAdapter"],
  "@priemskiyyy/anchor-solid": ["AnchorProvider", "useAnchor", "useSession"],
  "@priemskiyyy/anchor-svelte": ["AnchorProvider", "useAnchor", "useSession"],
  "@priemskiyyy/anchor-vue": ["AnchorProvider", "useAnchor", "useSession"],
  "@priemskiyyy/anchor-amplify": ["accessToken", "amplify", "idToken"],
  "@priemskiyyy/anchor-auth0": ["accessToken", "auth0"],
  "@priemskiyyy/anchor-auth0-react-native": ["accessToken", "auth0"],
  "@priemskiyyy/anchor-authjs": ["authjs"],
  "@priemskiyyy/anchor-better-auth": ["betterAuth"],
  "@priemskiyyy/anchor-better-auth-node": ["betterAuth"],
  "@priemskiyyy/anchor-clerk": ["clerk", "sessionToken"],
  "@priemskiyyy/anchor-clerk-node": ["clerk"],
  "@priemskiyyy/anchor-firebase": ["firebase", "idToken"],
  "@priemskiyyy/anchor-firebase-node": ["firebase"],
  "@priemskiyyy/anchor-firebase-react-native": ["firebase", "idToken"],
  "@priemskiyyy/anchor-http": ["http"],
  "@priemskiyyy/anchor-keycloak": ["accessToken", "keycloak"],
  "@priemskiyyy/anchor-msal": ["accessToken", "msal"],
  "@priemskiyyy/anchor-oidc": ["accessToken", "oidc"],
  "@priemskiyyy/anchor-okta": ["accessToken", "okta"],
  "@priemskiyyy/anchor-supabase": ["accessToken", "supabase"],
  "@priemskiyyy/anchor-supabase-node": ["supabase"],
  "@priemskiyyy/anchor-workos": ["accessToken", "workos", "workosRefreshes"],
  "@priemskiyyy/anchor-workos-node": ["workos"],
};

// Svelte ships its sources for the application's compiler, so plain Node
// cannot import these; their types are checked instead.
const SVELTE_ENTRIES = [SVELTE, "@priemskiyyy/anchor-devtools/svelte"];

// A manifest cannot say which entries are client modules, so they are listed.
const CLIENT_ENTRIES = [
  "@priemskiyyy/anchor-react/dist/index.js",
  "@priemskiyyy/anchor-devtools/dist/react.js",
];

// The core's internal owners and helpers (docs/internals/architecture.md), which
// no declaration a consumer reads may name.
const INTERNAL_ONLY =
  /\b(?:SessionRuntime|SessionRecord|ValueStore|Diagnostics|DiagnosticRecord|IdentifiedAnswer|Deferred|createDeferred|parseSessionAnswer|parseEndResult|parsePrincipal|parseSessionAction|parseToken|getOperationError|getAcceptedSession|getSecurityContextFingerprint|getSyncHintSession|createSessionKey|copyFrozen|isolate|isStructurallyEqual|isPlainObject)\b/;

const ENTRY_FILES = [
  "index.ts",
  "mock.ts",
  "testing.ts",
  "react.tsx",
  "vue.ts",
  "solid.ts",
  "svelte.ts",
];

const DOCUMENTED =
  /(\/\*\*[\s\S]*?\*\/(?:\s|\/\/[^\n]*)*)?^export (?:type|const|class|function|interface) (\w+)/gm;

const packages = ["packages", "packages/adapters"].flatMap((group) =>
  readdirSync(path.join(workspace, group)).flatMap((name) => {
    const directory = path.join(workspace, group, name);

    if (!existsSync(path.join(directory, "package.json"))) {
      return [];
    }

    const manifest = readJson(path.join(directory, "package.json"));

    return [{ group, name, directory, manifest }];
  }),
);

const workspaceNames = new Set(packages.map(({ manifest }) => manifest.name));

const getEntrySpecifier = (name, subpath) =>
  subpath === "." ? name : `${name}${subpath.slice(1)}`;

const getPackageName = (specifier) =>
  specifier
    .split("/")
    .slice(0, specifier.startsWith("@") ? 2 : 1)
    .join("/");

const toProblems = (name, checks) =>
  checks.flatMap(([failed, message]) => (failed ? [`${name} ${message}`] : []));

const run = (command, args, cwd) =>
  spawnSync(command, args, { cwd, encoding: "utf8", timeout: 300_000 });

const runOrThrow = (command, args, cwd) => {
  const result = run(command, args, cwd);

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
      { cause: result.error },
    );
  }

  return result.stdout;
};

const compareVersions = (left, right) => {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  const difference = [0, 1, 2]
    .map((index) => (leftParts[index] ?? 0) - (rightParts[index] ?? 0))
    .find((part) => part !== 0);

  return difference ?? 0;
};

const isInPeerRange = (version, range) => {
  const bounds = PEER_RANGE.exec(range);

  if (bounds === null) {
    return false;
  }

  return (
    compareVersions(version, bounds[1]) >= 0 &&
    compareVersions(version, bounds[2]) < 0
  );
};

// CONTRIBUTING.md's adapter template, "<Provider> sessions for Anchor: <what
// it observes and mints>, over the <sdk> you inject.", which a -node package
// says "for Anchor's server reads" and a -react-native one "for Anchor on
// React Native".
const getDescriptionTemplate = ({ group, name }) => {
  if (name === "core") {
    return /^Provider-independent session state for TypeScript: .+\.$/;
  }

  if (group !== "packages/adapters") {
    return /^[A-Z][^:]* for Anchor: .+\.$/;
  }

  if (name.endsWith("-node")) {
    return /^[A-Z][^:]* sessions for Anchor's server reads: .+, over the .+ you inject\.$/;
  }

  if (name.endsWith("-react-native")) {
    return /^[A-Z][^:]* sessions for Anchor on React Native: .+, over the .+ you inject\.$/;
  }

  return /^[A-Z][^:]* sessions for Anchor: .+, over the .+ you inject\.$/;
};

const getTemplateProblems = ({ group, name, directory, manifest }) => {
  const expectedName = name === "core" ? CORE : `${CORE}-${name}`;
  const isAdapter = group === "packages/adapters";
  const expectedFiles = manifest.name === SVELTE ? SVELTE_FILES : FILES;

  const repository = {
    type: "git",
    url: REPOSITORY,
    directory: `${group}/${name}`,
  };

  const description = getDescriptionTemplate({ group, name });
  const keywords = manifest.keywords ?? [];
  const readme = readTextIfExists(path.join(directory, "README.md"));
  const headings = readme.match(/^## .+$/gm) ?? [];

  return toProblems(manifest.name ?? `${group}/${name}`, [
    [
      manifest.name !== expectedName,
      `is named ${manifest.name}, not ${expectedName} after its directory`,
    ],
    [
      manifest.version !== coreManifest.version,
      `is version ${manifest.version}, not the core's ${coreManifest.version}: every package shares one version line`,
    ],
    [
      !description.test(manifest.description ?? ""),
      `has the description "${manifest.description}", which does not follow the template ${description.source}`,
    ],
    [
      String(manifest.description).includes(EM_DASH),
      "has an em dash in its description",
    ],
    [
      manifest.license !== "MIT",
      `has the license ${manifest.license}, not MIT`,
    ],
    [
      readTextIfExists(path.join(directory, "LICENSE")) !== rootLicense,
      "has a LICENSE that is not the repository's",
    ],
    [manifest.type !== "module", `has the type ${manifest.type}, not module`],
    [
      !isDeepStrictEqual(manifest.repository, repository),
      `has the repository ${JSON.stringify(manifest.repository)}, not ${JSON.stringify(repository)}`,
    ],
    [
      !isDeepStrictEqual(manifest.bugs, { url: BUGS }),
      `has the bugs ${JSON.stringify(manifest.bugs)}, not {"url":"${BUGS}"}`,
    ],
    [
      manifest.homepage !== HOMEPAGE,
      `has the homepage ${manifest.homepage}, not ${HOMEPAGE}`,
    ],
    [
      !isDeepStrictEqual(manifest.publishConfig, { access: "public" }),
      `has the publishConfig ${JSON.stringify(manifest.publishConfig)}, not {"access":"public"}`,
    ],
    [
      manifest.sideEffects !== false,
      `has sideEffects ${manifest.sideEffects}, not false`,
    ],
    [
      !isDeepStrictEqual(manifest.files, expectedFiles),
      `publishes the files ${JSON.stringify(manifest.files)}, not ${JSON.stringify(expectedFiles)}`,
    ],
    [
      "dependencies" in manifest,
      "declares dependencies: the core has none, and everything else peers on what it uses",
    ],
    [
      isAdapter &&
        (keywords.length < 5 ||
          !isDeepStrictEqual(keywords.slice(-3), [
            "typescript",
            "anchor",
            "adapter",
          ])),
      `has the keywords ${JSON.stringify(keywords)}, not the provider's and the platform's, then "typescript", "anchor", "adapter"`,
    ],
    [
      !isAdapter &&
        !(keywords.includes("typescript") && keywords.includes("anchor")),
      `has the keywords ${JSON.stringify(keywords)}, without "typescript" and "anchor"`,
    ],
    [
      !readme.startsWith(`# ${manifest.name}\n`),
      `has a README whose first line is not "# ${manifest.name}"`,
    ],
    [
      headings[0] !== "## Installation" || headings.at(-1) !== "## License",
      "has a README whose sections do not run from Installation to License",
    ],
  ]);
};

const getExportsProblems = ({ manifest }) => {
  const isSvelte = manifest.name === SVELTE;

  const conditions = isSvelte
    ? ["types", "svelte"]
    : ["types", "import", "default"];

  const exportsField = manifest.exports ?? {};
  const rootEntry = exportsField["."] ?? {};

  const expectedSubpaths = Object.keys(SURFACES).flatMap((specifier) => {
    if (specifier === manifest.name) {
      return ["."];
    }

    if (!specifier.startsWith(`${manifest.name}/`)) {
      return [];
    }

    return [`.${specifier.slice(manifest.name.length)}`];
  });

  return toProblems(manifest.name, [
    [
      !isDeepStrictEqual(Object.keys(exportsField), expectedSubpaths),
      `exports ${JSON.stringify(Object.keys(exportsField))}, not ${JSON.stringify(expectedSubpaths)}: list every entry point's runtime names in SURFACES`,
    ],
    ...Object.entries(exportsField).flatMap(([subpath, target]) => {
      const file = String(isSvelte ? target.svelte : target.import);

      return [
        [
          !isDeepStrictEqual(Object.keys(target), conditions),
          `exports ${subpath} with the conditions ${JSON.stringify(Object.keys(target))}, not ${JSON.stringify(conditions)}`,
        ],
        [
          !isSvelte && target.default !== target.import,
          `exports ${subpath} with default ${target.default}, not the ESM file import names`,
        ],
        [
          !file.startsWith("./dist/") || !file.endsWith(".js"),
          `exports ${subpath} from ${file}, not a .js file under ./dist/`,
        ],
        [
          target.types !== file.replace(/\.js$/, ".d.ts"),
          `exports the types of ${subpath} from ${target.types}, not the declarations beside ${file}`,
        ],
      ];
    }),
    [
      manifest.types !== rootEntry.types,
      `has types ${manifest.types}, not its root entry's ${rootEntry.types}`,
    ],
    [
      !isSvelte && manifest.main !== rootEntry.import,
      `has main ${manifest.main}, not its root entry's ${rootEntry.import}`,
    ],
    [
      isSvelte && (manifest.svelte !== rootEntry.svelte || "main" in manifest),
      `has svelte ${manifest.svelte} and main ${manifest.main}, not only svelte ${rootEntry.svelte}`,
    ],
  ]);
};

const getPeerProblems = ({ group, manifest }) => {
  const peers = manifest.peerDependencies ?? {};
  const optionalPeers = manifest.peerDependenciesMeta ?? {};
  const devDependencies = manifest.devDependencies ?? {};

  return toProblems(manifest.name, [
    ...Object.entries(peers).flatMap(([name, range]) => {
      const pinned = rootManifest.devDependencies[name] ?? "";

      if (workspaceNames.has(name)) {
        return [
          [
            range !== WORKSPACE_PEER_RANGE,
            `peers on ${name} at ${range}, not at the matching minor ${WORKSPACE_PEER_RANGE}`,
          ],
          [
            devDependencies[name] !== "workspace:*",
            `peers on ${name} without the workspace:* dev dependency that builds it against this workspace`,
          ],
        ];
      }

      return [
        [
          !PEER_RANGE.test(range),
          `peers on ${name} at ${range}, not at a lower and an upper bound as ">=1.2.0 <2"`,
        ],
        [
          !EXACT_VERSION.test(pinned),
          `peers on ${name}, which the root package.json does not pin exactly as a dev dependency`,
        ],
        [
          EXACT_VERSION.test(pinned) && !isInPeerRange(pinned, range),
          `peers on ${name} at ${range}, outside the ${pinned} the workspace tests against`,
        ],
        [
          group === "packages/adapters" &&
            optionalPeers[name]?.optional !== true,
          `peers on its SDK ${name} without marking it optional in peerDependenciesMeta`,
        ],
      ];
    }),
    ...Object.keys(optionalPeers).map((name) => [
      !(name in peers),
      `marks ${name} optional in peerDependenciesMeta without peering on it`,
    ]),
    ...Object.entries(devDependencies).map(([name, range]) => [
      !workspaceNames.has(name) || range !== "workspace:*",
      `has the dev dependency ${name} at ${range}: a package links only workspace packages, and the root package.json pins every SDK`,
    ]),
  ]);
};

const getUndocumentedExports = (file) => {
  const documentedByName = new Map();

  for (const [, doc, name] of readFileSync(file, "utf8").matchAll(DOCUMENTED)) {
    documentedByName.set(
      name,
      documentedByName.get(name) === true || doc?.includes("@example") === true,
    );
  }

  return Array.from(documentedByName).flatMap(([name, documented]) =>
    documented ? [] : [name],
  );
};

// Every declaration an entry re-exports carries an example,
// read from source, where one file holds one public type.
const getDocumentationProblems = ({ directory, manifest }) =>
  ENTRY_FILES.flatMap((entryFile) => {
    const entry = path.join(directory, "src", entryFile);

    if (!existsSync(entry)) {
      return [];
    }

    const targets = Array.from(
      readFileSync(entry, "utf8").matchAll(
        /^export (?:type )?\{[^}]*\} from "(?:src\/|\.\/)([^"]+)"/gm,
      ),
      ([, target]) => target,
    );

    const missing = targets.flatMap((target) => {
      // A Svelte component documents its props in the component file.
      if (target.endsWith(".svelte")) {
        return [];
      }

      const base = path.join(directory, "src", target.replace(/\.js$/, ""));

      const source = [`${base}.ts`, `${base}.tsx`].find((file) =>
        existsSync(file),
      );

      if (source === undefined) {
        return [`${target} (not found)`];
      }

      return getUndocumentedExports(source);
    });

    return toProblems(manifest.name, [
      [
        missing.length > 0,
        `re-exports from src/${entryFile} without an @example: ${missing.join(", ")}`,
      ],
    ]);
  });

const getTarballProblems = (manifest, packedFiles) => {
  const files = new Set(packedFiles.map((file) => file.path));

  const targets = new Set(
    [
      manifest.main,
      manifest.types,
      manifest.svelte,
      ...Object.values(manifest.exports ?? {}).flatMap((target) =>
        Object.values(target),
      ),
    ].flatMap((target) =>
      typeof target === "string" ? [target.replace(/^\.\//, "")] : [],
    ),
  );

  return toProblems(manifest.name, [
    [!files.has("README.md"), "packs no README.md"],
    [!files.has("LICENSE"), "packs no LICENSE"],
    ...Array.from(targets, (target) => [
      !files.has(target),
      `packs no ${target}, which its package.json points at`,
    ]),
    ...Array.from(files, (file) => [
      file.startsWith("src/") || /\.(test|fixture|contracts)\./.test(file),
      `packs ${file}, which is for this repository only`,
    ]),
  ]);
};

const getPublintProblems = async (manifest, tarball) => {
  const bytes = readFileSync(tarball);

  const { messages, pkg } = await publint({
    pack: {
      tarball: bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ),
    },
    strict: true,
  });

  return messages.map(
    (message) =>
      `${manifest.name} fails publint (${message.type}): ${formatMessage(message, pkg, { color: false }) ?? message.code}`,
  );
};

const listFiles = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true }).flatMap(
    (entry) =>
      entry.isFile() ? [path.join(entry.parentPath, entry.name)] : [],
  );

// The scanner skips comments, so a JSDoc example that imports an SDK is not
// an import.
const getImportSpecifiers = (file) => {
  const source = readTextIfExists(file);

  const code = file.endsWith(".svelte")
    ? Array.from(
        source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g),
        ([, script]) => script,
      ).join("\n")
    : source;

  const { importedFiles, referencedFiles, typeReferenceDirectives } =
    ts.preProcessFile(code, true, true);

  return [...importedFiles, ...referencedFiles, ...typeReferenceDirectives].map(
    ({ fileName }) => fileName,
  );
};

// A published file imports only its own dist, its package and its declared
// peers, and an adapter never its SDK, which the application passes as `sdk`.
const getImportProblems = ({ group, manifest }, installed) => {
  const peers = manifest.peerDependencies ?? {};
  const optionalPeers = manifest.peerDependenciesMeta ?? {};
  const dist = `${path.join(installed, "dist")}${path.sep}`;

  return listFiles(installed).flatMap((file) => {
    if (!/\.(js|d\.ts|svelte)$/.test(file)) {
      return [];
    }

    const published = path.posix.join(
      manifest.name,
      path.relative(installed, file),
    );

    return getImportSpecifiers(file).flatMap((specifier) => {
      if (specifier.startsWith(".")) {
        return path.resolve(path.dirname(file), specifier).startsWith(dist)
          ? []
          : [`${published} imports ${specifier}, outside its dist`];
      }

      const name = getPackageName(specifier);

      if (name === manifest.name) {
        return [];
      }

      if (!(name in peers)) {
        return [
          `${published} imports ${specifier}, which is not a declared peer`,
        ];
      }

      if (
        group === "packages/adapters" &&
        optionalPeers[name]?.optional === true
      ) {
        return [
          `${published} imports its SDK ${specifier}, which the application passes as sdk`,
        ];
      }

      return [];
    });
  });
};

const getEntryBundleProblems = ({ manifest }, installed) =>
  Object.values(manifest.exports ?? {}).flatMap((target) => {
    const entry = String(target.import ?? target.svelte);
    const file = path.posix.join(manifest.name, entry);
    const bundle = readTextIfExists(path.join(installed, entry));
    const client = CLIENT_ENTRIES.includes(file);

    return toProblems(file, [
      [
        bundle.startsWith('"use client";') !== client,
        client
          ? 'does not start with "use client"'
          : 'starts with "use client"',
      ],
      // Default exports break silently under some React Native interop.
      [
        /^export default |\bas default\s*[,}]/m.test(bundle),
        "has a default export",
      ],
    ]);
  });

const getResolvedCore = (installed) => {
  try {
    return realpathSync(
      createRequire(path.join(installed, "package.json")).resolve(CORE),
    );
  } catch {
    return null;
  }
};

const formatDiagnostics = (diagnostics, cwd) =>
  ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (name) => name,
    getCurrentDirectory: () => cwd,
    getNewLine: () => "\n",
  });

// The contracts and every entry point at a consumer's strictest settings,
// including the packages' own emitted declarations at skipLibCheck: false,
// without paying to report the whole of React's, Vue's and the DOM's.
const getTypecheckProblems = (consumer, rootNames, declarations, mode) => {
  const program = ts.createProgram(rootNames, {
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    module: mode === "NodeNext" ? ts.ModuleKind.NodeNext : ts.ModuleKind.ESNext,
    moduleResolution:
      mode === "NodeNext"
        ? ts.ModuleResolutionKind.NodeNext
        : ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    skipLibCheck: false,
    noEmit: true,
  });

  const loaded = new Set(
    program.getSourceFiles().map(({ fileName }) => fileName),
  );

  const checked = program
    .getSourceFiles()
    .filter(
      ({ fileName }) =>
        rootNames.includes(fileName) ||
        /[/\\]@priemskiyyy[/\\]anchor(?:-[^/\\]+)?[/\\]dist[/\\].+\.d\.ts$/.test(
          fileName,
        ),
    );

  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...checked.flatMap((source) => [
      ...program.getSyntacticDiagnostics(source),
      ...program.getSemanticDiagnostics(source),
    ]),
  ];

  return [
    ...declarations.flatMap(({ specifier, types, file }) =>
      loaded.has(file)
        ? []
        : [`${specifier} loads no declarations from ${types} under ${mode}`],
    ),
    ...(diagnostics.length === 0
      ? []
      : [
          `The consumer does not typecheck under ${mode}:\n${formatDiagnostics(diagnostics, consumer)}`,
        ]),
  ];
};

const stageRelease = ({ name, filename, tarball }) => {
  const directory = path.join(release, name);

  const checksum = createHash("sha256")
    .update(readFileSync(tarball))
    .digest("hex");

  mkdirSync(directory, { recursive: true });
  copyFileSync(tarball, path.join(directory, filename));
  writeFileSync(
    path.join(directory, "SHA256SUMS"),
    `${checksum}  ${filename}\n`,
  );
};

// The peers a consumer installs beside the packages: every one a package
// other than an adapter declares, at the version the workspace pins, and the
// DefinitelyTyped types the workspace pins for it. The adapters' optional SDKs
// stay out, so the install proves no adapter needs its provider installed.
const consumerDependencies = [
  ...new Set(
    packages.flatMap(({ group, manifest }) => {
      if (group === "packages/adapters") {
        return [];
      }

      return Object.keys(manifest.peerDependencies ?? {}).flatMap((name) => {
        if (workspaceNames.has(name)) {
          return [];
        }

        const types = `@types/${name}`;

        return types in rootManifest.devDependencies ? [name, types] : [name];
      });
    }),
  ),
].sort();

const CONTRACTS = `import { Anchor, AnchorError } from "@priemskiyyy/anchor";
import type { AdapterSession, EndResult, SessionAdapter, SessionAnswer, SessionState, Token, TokenRequest } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import type { MockAdapter } from "@priemskiyyy/anchor/mock";
import { testSessionAdapter } from "@priemskiyyy/anchor/testing";
import type { SessionAdapterFixture } from "@priemskiyyy/anchor/testing";
import { accessToken as amplifyAccessToken, amplify, idToken as amplifyIdToken } from "@priemskiyyy/anchor-amplify";
import type { AmplifyLike } from "@priemskiyyy/anchor-amplify";
import { accessToken as auth0AccessToken, auth0 } from "@priemskiyyy/anchor-auth0";
import type { Auth0ClientLike } from "@priemskiyyy/anchor-auth0";
import { accessToken as auth0NativeAccessToken, auth0 as auth0Native } from "@priemskiyyy/anchor-auth0-react-native";
import type { Auth0IdTokenParserLike, Auth0Like } from "@priemskiyyy/anchor-auth0-react-native";
import { authjs } from "@priemskiyyy/anchor-authjs";
import type { AuthjsClientLike } from "@priemskiyyy/anchor-authjs";
import { betterAuth } from "@priemskiyyy/anchor-better-auth";
import type { BetterAuthClientLike } from "@priemskiyyy/anchor-better-auth";
import { betterAuth as betterAuthServer } from "@priemskiyyy/anchor-better-auth-node";
import type { BetterAuthServerLike } from "@priemskiyyy/anchor-better-auth-node";
import { crossTab, online, visibility } from "@priemskiyyy/anchor-browser";
import { clerk, sessionToken } from "@priemskiyyy/anchor-clerk";
import type { ClerkLike } from "@priemskiyyy/anchor-clerk";
import { clerk as clerkServer } from "@priemskiyyy/anchor-clerk-node";
import { AnchorDevtools } from "@priemskiyyy/anchor-devtools";
import { AnchorDevtools as AnchorDevtoolsView } from "@priemskiyyy/anchor-devtools/react";
import { firebase, idToken } from "@priemskiyyy/anchor-firebase";
import type { FirebaseAuthLike } from "@priemskiyyy/anchor-firebase";
import { firebase as firebaseServer } from "@priemskiyyy/anchor-firebase-node";
import { firebase as firebaseNative, idToken as firebaseNativeIdToken } from "@priemskiyyy/anchor-firebase-react-native";
import type { FirebaseAuthLike as FirebaseNativeAuthLike } from "@priemskiyyy/anchor-firebase-react-native";
import { http } from "@priemskiyyy/anchor-http";
import { accessToken as keycloakAccessToken, keycloak } from "@priemskiyyy/anchor-keycloak";
import type { KeycloakLike } from "@priemskiyyy/anchor-keycloak";
import { accessToken as msalAccessToken, msal } from "@priemskiyyy/anchor-msal";
import type { MsalLike, MsalSessionUser } from "@priemskiyyy/anchor-msal";
import { accessToken as oidcAccessToken, oidc } from "@priemskiyyy/anchor-oidc";
import type { OidcUserManagerLike } from "@priemskiyyy/anchor-oidc";
import { accessToken as oktaAccessToken, okta } from "@priemskiyyy/anchor-okta";
import type { OktaAuthLike } from "@priemskiyyy/anchor-okta";
import { AnchorProvider, useAnchor, useSession } from "@priemskiyyy/anchor-react";
import type { RegisteredAnchor, RegisteredSessionState, RegisteredTokenProfile, RegisteredUser } from "@priemskiyyy/anchor-react";
import { appState } from "@priemskiyyy/anchor-react-native";
import type { AppStateLike } from "@priemskiyyy/anchor-react-native";
import { getRequestSession, getSessionHydration } from "@priemskiyyy/anchor-server";
import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";
import type { ServerSessionAdapterFixture } from "@priemskiyyy/anchor-server/testing";
import { accessToken as supabaseAccessToken, supabase } from "@priemskiyyy/anchor-supabase";
import type { SupabaseClientLike } from "@priemskiyyy/anchor-supabase";
import { supabase as supabaseServer } from "@priemskiyyy/anchor-supabase-node";
import { accessToken as workosAccessToken, workos, workosRefreshes } from "@priemskiyyy/anchor-workos";
import type { WorkosClientLike } from "@priemskiyyy/anchor-workos";
import { workos as workosServer } from "@priemskiyyy/anchor-workos-node";

type Equal<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
const expectType = <TCheck extends true>(check: TCheck) => check;

type AppUser = { id: string };

declare const amplifySdk: AmplifyLike;
declare const auth0Client: Auth0ClientLike;
declare const auth0NativeClient: Auth0Like;
declare const parseIdToken: Auth0IdTokenParserLike;
declare const nextAuth: AuthjsClientLike;
declare const betterAuthClient: BetterAuthClientLike;
declare const betterAuthServerSdk: BetterAuthServerLike;
declare const clerkInstance: ClerkLike;
declare const firebaseAuth: FirebaseAuthLike;
declare const firebaseNativeAuth: FirebaseNativeAuthLike;
declare const keycloakInstance: KeycloakLike;
declare const msalInstance: MsalLike;
declare const userManager: OidcUserManagerLike;
declare const oktaAuth: OktaAuthLike;
declare const supabaseClient: SupabaseClientLike;
declare const workosClient: WorkosClientLike;
declare const AppState: AppStateLike;

// The registered path: one augmentation types the provider and every hook.
export const anchor = new Anchor({
  adapter: firebase({ sdk: firebaseAuth, user: (user) => ({ id: user.uid }), tokens: { api: idToken() } }),
  timeout: 5_000,
  hints: [visibility(), online(), crossTab({ name: "contracts" }), appState({ sdk: AppState })],
});

declare module "@priemskiyyy/anchor-react" {
  interface Register {
    anchor: typeof anchor;
  }
}

expectType<Equal<RegisteredUser, AppUser>>(true);
expectType<Equal<RegisteredTokenProfile, "api">>(true);
expectType<Equal<RegisteredAnchor, typeof anchor>>(true);
expectType<Equal<typeof anchor.native, FirebaseAuthLike>>(true);
expectType<Equal<ReturnType<typeof anchor.session.get>, SessionState<AppUser, "api">>>(true);

// Every client adapter, created as its README shows, over the structural SDK type it publishes.
export const clientAnchors = {
  amplify: new Anchor({ adapter: amplify({ sdk: amplifySdk, tokens: { api: amplifyAccessToken(), id: amplifyIdToken() } }) }),
  auth0: new Anchor({ adapter: auth0({ sdk: auth0Client, tokens: { api: auth0AccessToken({ audience: "https://api.example.com" }) }, returnTo: "https://app.example.com" }) }),
  auth0Native: new Anchor({ adapter: auth0Native({ sdk: auth0NativeClient, domain: "example.us.auth0.com", parseIdToken, tokens: { api: auth0NativeAccessToken({ audience: "https://api.example.com" }) } }) }),
  authjs: new Anchor({ adapter: authjs({ sdk: nextAuth }) }),
  betterAuth: new Anchor({ adapter: betterAuth({ sdk: betterAuthClient }) }),
  clerk: new Anchor({ adapter: clerk({ sdk: clerkInstance, tokens: { api: sessionToken({ template: "api" }) } }) }),
  firebaseNative: new Anchor({ adapter: firebaseNative({ sdk: firebaseNativeAuth, tokens: { api: firebaseNativeIdToken() } }) }),
  http: new Anchor({ adapter: http({ authority: "https://api.example.com", read: () => null, tokens: { realtime: () => ({ value: "token", subject: "user_1" }) } }) }),
  keycloak: new Anchor({ adapter: keycloak({ sdk: keycloakInstance, tokens: { api: keycloakAccessToken() } }) }),
  msal: new Anchor({ adapter: msal({ sdk: msalInstance, tokens: { graph: msalAccessToken({ scopes: ["User.Read"] }) } }) }),
  oidc: new Anchor({ adapter: oidc({ sdk: userManager, tokens: { api: oidcAccessToken() } }) }),
  okta: new Anchor({ adapter: okta({ sdk: oktaAuth, tokens: { api: oktaAccessToken() } }) }),
  supabase: new Anchor({ adapter: supabase({ sdk: supabaseClient, user: (user) => ({ id: user.id }), tokens: { api: supabaseAccessToken() } }) }),
  workos: new Anchor({ adapter: workos({ sdk: workosClient, refreshes: workosRefreshes(), tokens: { api: workosAccessToken() } }) }),
};

expectType<Equal<typeof clientAnchors.supabase.native, SupabaseClientLike>>(true);
expectType<Equal<ReturnType<typeof clientAnchors.supabase.session.get>, SessionState<AppUser, "api">>>(true);
expectType<Equal<ReturnType<typeof clientAnchors.msal.session.get>, SessionState<MsalSessionUser, "graph">>>(true);

// @ts-expect-error -- an adapter takes the SDK the application set up.
firebase({ tokens: { api: idToken() } });

// Every server adapter answers the request contract of anchor-server.
export const serverAdapters: ((options: never) => ServerSessionAdapter)[] = [betterAuthServer, clerkServer, firebaseServer, supabaseServer, workosServer];

export const readRequest = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter: betterAuthServer({ sdk: betterAuthServerSdk }), timeout: 5_000 });
  const hydration = getSessionHydration(state, { select: ({ user }) => ({ name: user.name }) });

  return { hydration, headers };
};

export const View = () => {
  const state = useSession();
  const status = useSession((current) => current.status);
  const registered = useAnchor();

  expectType<Equal<typeof state, RegisteredSessionState>>(true);
  expectType<Equal<typeof status, RegisteredSessionState["status"]>>(true);
  expectType<Equal<typeof registered, typeof anchor>>(true);

  if (state.status !== "signed-in") {
    return <span>{status}</span>;
  }

  // @ts-expect-error -- "reports" is not a registered token profile.
  state.session.getToken("reports");

  return <span>{state.session.user.id}</span>;
};

export const Root = () => (
  <AnchorProvider anchor={anchor}>
    <View />
    <AnchorDevtoolsView initialIsOpen maxEvents={100} />
  </AnchorProvider>
);

export const inspector = new AnchorDevtools({ anchor, maxEvents: 100 });

const mock: MockAdapter<AppUser, "api"> = createMockAdapter<AppUser, "api">({ tokens: { api: {} } });

expectType<Equal<ReturnType<typeof mock.current>, SessionAnswer<AppUser>>>(true);

// A third party can write an adapter and test it from the published types alone.
type LogLike = { user: AppUser | null; listeners: Set<() => void> };

declare const log: LogLike;

const getLogAnswer = (): SessionAnswer<AppUser> => {
  if (log.user === null) {
    return { status: "signed-out" };
  }

  return {
    status: "signed-in",
    principal: { authority: "https://log.example.com", subject: log.user.id, tenant: null },
    user: log.user,
    context: null,
    guest: false,
    impersonated: false,
  };
};

export const custom = (): SessionAdapter<AppUser, LogLike, "api"> => ({
  name: "log",
  native: log,
  tokens: { api: {} },
  open: (observer): AdapterSession<AppUser, "api"> => {
    const handleChange = () => observer.session(getLogAnswer());

    log.listeners.add(handleChange);

    return {
      read: () => getLogAnswer(),
      getToken: (request: TokenRequest<"api">): Token => {
        if (log.user?.id !== request.session.principal.subject) {
          throw new AnchorError({ code: "SESSION_CHANGED", message: "Another user is signed in." });
        }

        return { value: "token", kind: "access-token", scheme: "Bearer" };
      },
      end: (): EndResult => ({ local: "completed", remote: "not-applicable", navigation: null }),
      dispose: () => {
        log.listeners.delete(handleChange);
      },
    };
  },
});

testSessionAdapter({
  name: "log",
  createFixture: (): SessionAdapterFixture<AppUser, LogLike, "api"> => ({
    adapter: custom(),
    native: log,
    profiles: ["api"],
    signIn: (subject) => {
      log.user = { id: subject };
    },
    signOut: () => {
      log.user = null;
    },
    listeners: () => log.listeners.size,
    observes: true,
  }),
});

declare const cookieServer: ServerSessionAdapter<AppUser, Map<string, AppUser>>;

testServerSessionAdapter({
  name: "cookie",
  createFixture: (): ServerSessionAdapterFixture<AppUser, Map<string, AppUser>> => ({
    adapter: cookieServer,
    url: "https://app.example.com/",
    native: cookieServer.native,
    signIn: (name) => ({ headers: new Headers({ cookie: \`session=\${name}\` }), subject: name }),
    signOut: () => {},
  }),
});
`;

const FRAMEWORK_CONTRACTS = `import { createComponent } from "solid-js";
import { h } from "vue";
import { AnchorDevtools as SolidDevtools } from "@priemskiyyy/anchor-devtools/solid";
import { createDevtoolsAttachment } from "@priemskiyyy/anchor-devtools/svelte";
import { AnchorDevtools as VueDevtools } from "@priemskiyyy/anchor-devtools/vue";
import * as solid from "@priemskiyyy/anchor-solid";
import type { RegisteredTokenProfile as SolidProfile, RegisteredUser as SolidUser } from "@priemskiyyy/anchor-solid";
import * as svelte from "@priemskiyyy/anchor-svelte";
import type { RegisteredTokenProfile as SvelteProfile, RegisteredUser as SvelteUser } from "@priemskiyyy/anchor-svelte";
import * as vue from "@priemskiyyy/anchor-vue";
import type { RegisteredTokenProfile as VueProfile, RegisteredUser as VueUser } from "@priemskiyyy/anchor-vue";
import type { anchor } from "./contracts.js";

type Equal<TLeft, TRight> = (<T>() => T extends TLeft ? 1 : 2) extends <T>() => T extends TRight ? 1 : 2 ? true : false;
const expectType = <TCheck extends true>(check: TCheck) => check;

// The registered path, once per binding.
declare module "@priemskiyyy/anchor-vue" {
  interface Register {
    anchor: typeof anchor;
  }
}
declare module "@priemskiyyy/anchor-solid" {
  interface Register {
    anchor: typeof anchor;
  }
}
declare module "@priemskiyyy/anchor-svelte" {
  interface Register {
    anchor: typeof anchor;
  }
}

expectType<Equal<VueProfile, "api">>(true);
expectType<Equal<SolidProfile, "api">>(true);
expectType<Equal<SvelteProfile, "api">>(true);
expectType<Equal<VueUser, { id: string }>>(true);
expectType<Equal<SolidUser, { id: string }>>(true);
expectType<Equal<SvelteUser, { id: string }>>(true);

export const useVue = () => {
  const state = vue.useSession().value;
  const status: string = vue.useSession((current) => current.status).value;

  if (state.status === "signed-in") {
    // @ts-expect-error -- "reports" is not a registered token profile.
    state.session.getToken("reports");
  }

  return [status, h(vue.AnchorProvider, { anchor: vue.useAnchor() }), h(VueDevtools, { maxEvents: 100 })];
};

export const useSolid = () => {
  const state = solid.useSession()();
  const status: string = solid.useSession((current) => current.status)();

  if (state.status === "signed-in") {
    // @ts-expect-error -- "reports" is not a registered token profile.
    state.session.getToken("reports");
  }

  return [
    status,
    createComponent(solid.AnchorProvider, {
      anchor: solid.useAnchor(),
      get children() {
        return createComponent(SolidDevtools, { initialIsOpen: true });
      },
    }),
  ];
};

export const useSvelte = () => {
  const state = svelte.useSession().current;
  const status: string = svelte.useSession((current) => current.status).current;
  const props: svelte.AnchorProviderProps = { anchor: svelte.useAnchor() };

  if (state.status === "signed-in") {
    // @ts-expect-error -- "reports" is not a registered token profile.
    state.session.getToken("reports");
  }

  return [status, props, svelte.AnchorProvider, createDevtoolsAttachment({ maxEvents: 100 })];
};
`;

// testSessionAdapter and testServerSessionAdapter register real Vitest tests,
// so they run the way an adapter author runs them: inside Vitest.
const CONFORMANCE = `import type { SessionAnswer } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { testSessionAdapter } from "@priemskiyyy/anchor/testing";
import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";

type User = { name: string };

const signedIn = (subject: string): SessionAnswer<User> => ({
  status: "signed-in",
  principal: { authority: "https://login.example.com", subject, tenant: null },
  user: { name: subject },
  context: null,
  guest: false,
  impersonated: false,
});

const signedOut: SessionAnswer<User> = { status: "signed-out" };

testSessionAdapter({
  name: "mock",
  createFixture: () => {
    const mock = createMockAdapter<User, "api">({ tokens: { api: {} } });

    return {
      adapter: mock.adapter,
      native: mock.adapter.native,
      profiles: ["api"],
      signIn: (subject: string) => mock.push(signedIn(subject)),
      signOut: () => mock.push(signedOut),
      listeners: () => mock.sessions.filter(({ disposeCount }) => disposeCount === 0).length,
      observes: true,
      switchSilently: (subject: string) => mock.change(signedIn(subject)),
    };
  },
});

const getSessionCookie = (headers: Headers) => /(?:^|;\\s*)session=([^;]+)/.exec(headers.get("cookie") ?? "")?.[1] ?? null;

testServerSessionAdapter({
  name: "cookie",
  createFixture: () => {
    const sessions = new Map<string, string>();

    const adapter: ServerSessionAdapter<User, Map<string, string>> = {
      name: "cookie",
      native: sessions,
      read: ({ headers }) => {
        const subject = sessions.get(getSessionCookie(headers) ?? "");

        return subject === undefined ? signedOut : signedIn(subject);
      },
    };

    return {
      adapter,
      native: sessions,
      signIn: (name: string) => {
        const cookie = \`cookie_\${sessions.size + 1}\`;

        sessions.set(cookie, name);

        return { headers: new Headers({ cookie: \`session=\${cookie}\` }), subject: name };
      },
      signOut: (headers: Headers) => {
        sessions.delete(getSessionCookie(headers) ?? "");
      },
    };
  },
});
`;

const getSmoke = (surfaces) => `import assert from "node:assert/strict";
import * as core from "@priemskiyyy/anchor";
import { http } from "@priemskiyyy/anchor-http";
import { getRequestSession, getSessionHydration } from "@priemskiyyy/anchor-server";

// Named exports only, and exactly the ones each package promises.
const getSurfaceFailure = async ([specifier, names]) => {
  try {
    const exported = Object.keys(await import(specifier)).sort();

    return JSON.stringify(exported) === JSON.stringify([...names].sort())
      ? []
      : [specifier + " exports " + JSON.stringify(exported) + ", not " + JSON.stringify(names)];
  } catch (error) {
    return [specifier + " cannot be imported: " + error.message];
  }
};

const surfaceFailures = (await Promise.all(Object.entries(${JSON.stringify(surfaces, null, 2)}).map(getSurfaceFailure))).flat();

const ada = {
  status: "signed-in",
  principal: { authority: "https://login.example.com", subject: "ada", tenant: null },
  user: { name: "Ada" },
  context: null,
  guest: false,
  impersonated: false,
};

// Constructing and observing an Anchor reaches no provider: the adapter is
// cold and observing creates no demand.
const opened = [];
const minted = [];
let current = ada;

const anchor = new core.Anchor({
  adapter: {
    name: "smoke",
    native: null,
    tokens: { api: {} },
    open: () => {
      opened.push("open");

      return {
        read: () => current,
        getToken: ({ session }) => {
          minted.push(session.principal.subject);

          return { value: "token-for-ada", kind: "access-token", scheme: "Bearer" };
        },
        end: () => {
          current = { status: "signed-out" };

          return { local: "completed", remote: "not-applicable", navigation: null };
        },
      };
    },
  },
});

const unsubscribe = anchor.session.subscribe(() => {});

assert.deepEqual(opened, [], "Constructing and observing an Anchor must open nothing.");
assert.equal(anchor.session.get().status, "initializing");

await anchor.start();
assert.deepEqual(opened, ["open"], "start() must open the adapter exactly once.");

const state = anchor.session.get();

assert.equal(state.status, "signed-in");
assert.deepEqual(state.session.principal, ada.principal);
assert.deepEqual(await state.session.getToken("api"), { value: "token-for-ada", kind: "access-token", scheme: "Bearer" });
assert.deepEqual(minted, ["ada"], "A token must be minted for the session that asked.");
assert.deepEqual(await state.session.end(), { local: "completed", remote: "not-applicable", navigation: null });
assert.equal(anchor.session.get().status, "signed-out");
unsubscribe();
anchor.dispose();

// One core: the SESSION_CHANGED an adapter package raises reaches the
// consumer unwrapped, which the core does only for its own AnchorError class.
const backend = new core.Anchor({
  adapter: http({
    authority: "https://api.example.com",
    read: () => ({ subject: "ada", user: { name: "Ada" } }),
    tokens: { api: () => ({ value: "token-for-grace", subject: "grace" }) },
  }),
});

await backend.start();

const backendState = backend.session.get();

assert.equal(backendState.status, "signed-in");
await assert.rejects(
  backendState.session.getToken("api"),
  (error) => error instanceof core.AnchorError && error.code === "SESSION_CHANGED",
);
backend.dispose();

assert.throws(
  () => new core.Anchor({ adapter: { name: "smoke", native: null, tokens: {}, open: () => ({ read: () => current }) }, timeout: 0 }),
  (error) => error instanceof core.AnchorError && error.code === "INVALID_CONFIGURATION",
);

// One request read on the server, with the cookie the provider refreshed on
// the response and the request's own headers left alone.
const requestHeaders = new Headers({ cookie: "session=ada" });

const { state: requestState, headers } = await getRequestSession(
  { url: "https://app.example.com/", method: "GET", headers: requestHeaders },
  {
    adapter: {
      name: "smoke-server",
      native: null,
      read: ({ headers: sent, responseHeaders }) => {
        responseHeaders.append("set-cookie", "session=ada; Path=/");

        return sent.get("cookie") === "session=ada" ? ada : { status: "signed-out" };
      },
    },
  },
);

assert.equal(requestState.status, "signed-in");
assert.deepEqual(headers.getSetCookie(), ["session=ada; Path=/"]);
assert.deepEqual([...requestHeaders], [["cookie", "session=ada"]]);
assert.deepEqual(getSessionHydration(requestState, { select: ({ user }) => ({ name: user.name }) }), { status: "signed-in", user: { name: "Ada" } });
console.log("The packed packages work end to end under Node, with one copy of the core.");
assert.deepEqual(surfaceFailures, [], "Every entry point exports exactly the names it promises, and no default.");
`;

const problems = [];

const consumer = realpathSync(
  mkdtempSync(path.join(tmpdir(), "anchor-consumer-")),
);

const tarballs = path.join(consumer, "tarballs");

const writeConsumerFile = (name, content) =>
  writeFileSync(path.join(consumer, name), content);

try {
  rmSync(release, { recursive: true, force: true });
  mkdirSync(tarballs);

  process.stdout.write(`Checking ${packages.length} package manifests...\n`);

  for (const entry of packages) {
    problems.push(
      ...getTemplateProblems(entry),
      ...getExportsProblems(entry),
      ...getPeerProblems(entry),
      ...getDocumentationProblems(entry),
    );
  }

  const registered = new Set(
    packages.flatMap(({ manifest }) =>
      Object.keys(manifest.exports ?? {}).map((subpath) =>
        getEntrySpecifier(manifest.name, subpath),
      ),
    ),
  );

  problems.push(
    ...Object.keys(SURFACES).flatMap((specifier) =>
      registered.has(specifier)
        ? []
        : [`SURFACES lists ${specifier}, which no package exports`],
    ),
  );

  process.stdout.write("Packing each package and linting its tarball...\n");

  const packed = [];

  for (const { directory, manifest } of packages) {
    const [result] = JSON.parse(
      runOrThrow(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", tarballs],
        directory,
      ),
    );

    const tarball = path.join(tarballs, result.filename);

    problems.push(
      ...getTarballProblems(manifest, result.files),
      ...(await getPublintProblems(manifest, tarball)),
    );
    packed.push({ name: manifest.name, filename: result.filename, tarball });
  }

  writeConsumerFile(
    "package.json",
    `${JSON.stringify(
      {
        name: "anchor-package-consumer",
        private: true,
        type: "module",
        // The workspace's pnpm, so a warm store serves the install without the network.
        packageManager: rootManifest.packageManager,
        dependencies: Object.fromEntries([
          ...consumerDependencies.map((name) => [
            name,
            rootManifest.devDependencies[name],
          ]),
          ...packed.map(({ name, filename }) => [
            name,
            `file:./tarballs/${filename}`,
          ]),
        ]),
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(
    `Installing the packed packages in an isolated consumer beside ${consumerDependencies.join(", ")}...\n`,
  );
  // Peers resolve only to what the consumer lists, as an application's do.
  runOrThrow(
    "pnpm",
    [
      "install",
      "--prefer-offline",
      "--ignore-workspace",
      "--ignore-scripts",
      "--config.auto-install-peers=false",
    ],
    consumer,
  );

  process.stdout.write("Checking the installed files...\n");

  const installedDirectories = new Map(
    packages.map(({ manifest }) => [
      manifest.name,
      realpathSync(path.join(consumer, "node_modules", manifest.name)),
    ]),
  );

  const coreEntry = getResolvedCore(consumer);

  for (const entry of packages) {
    const installed = installedDirectories.get(entry.manifest.name);
    const resolvedCore = getResolvedCore(installed);

    problems.push(
      ...getImportProblems(entry, installed),
      ...getEntryBundleProblems(entry, installed),
      // Exactly one copy of the core, however many packages build on it.
      ...toProblems(entry.manifest.name, [
        [
          entry.manifest.name !== CORE && resolvedCore !== coreEntry,
          `resolves ${CORE} to ${resolvedCore}, not the consumer's one copy ${coreEntry}`,
        ],
      ]),
    );
  }

  const devtools = path.join(
    installedDirectories.get("@priemskiyyy/anchor-devtools"),
    "dist",
  );

  const inspectorImports = getImportSpecifiers(path.join(devtools, "index.js"));

  const coreDeclarations = listFiles(
    path.join(installedDirectories.get(CORE), "dist"),
  ).flatMap((file) =>
    file.endsWith(".d.ts") ? [readFileSync(file, "utf8")] : [],
  );

  problems.push(
    ...toProblems("The devtools", [
      ...["react", "vue", "solid", "svelte"].map((wrapper) => [
        readTextIfExists(path.join(devtools, `${wrapper}.js`)).includes(
          "already mounted",
        ),
        `${wrapper} wrapper bundles a second inspector instead of importing @priemskiyyy/anchor-devtools`,
      ]),
      // The inspector carries its own Solid runtime, so a host needs none.
      [
        inspectorImports.some(
          (specifier) => !specifier.startsWith(".") && specifier !== CORE,
        ),
        `inspector imports ${inspectorImports.join(", ")}, not the core alone`,
      ],
    ]),
    ...toProblems("The core's declarations", [
      [
        !readTextIfExists(
          path.join(installedDirectories.get(CORE), "dist/index.d.ts"),
        ).includes("@example"),
        "lost their examples",
      ],
      [
        coreDeclarations.some((declaration) =>
          INTERNAL_ONLY.test(declaration.replace(/\/\*[\s\S]*?\*\//g, "")),
        ),
        "name an internal owner or helper",
      ],
    ]),
  );

  writeConsumerFile("contracts.tsx", CONTRACTS);
  writeConsumerFile("contracts.frameworks.ts", FRAMEWORK_CONTRACTS);

  const entries = Object.keys(SURFACES);

  writeConsumerFile(
    "entries.ts",
    `${entries.map((specifier, index) => `import * as entry${index} from ${JSON.stringify(specifier)};`).join("\n")}\n\nexport { ${entries.map((_specifier, index) => `entry${index}`).join(", ")} };\n`,
  );

  const declarations = packages.flatMap(({ manifest }) =>
    Object.entries(manifest.exports ?? {}).map(([subpath, target]) => ({
      specifier: getEntrySpecifier(manifest.name, subpath),
      types: String(target.types),
      file: path.join(
        installedDirectories.get(manifest.name),
        String(target.types),
      ),
    })),
  );

  const rootNames = [
    "contracts.tsx",
    "contracts.frameworks.ts",
    "entries.ts",
  ].map((name) => path.join(consumer, name));

  process.stdout.write(
    "Typechecking every entry point as a consumer, under Bundler and NodeNext...\n",
  );

  for (const mode of ["Bundler", "NodeNext"]) {
    problems.push(
      ...getTypecheckProblems(consumer, rootNames, declarations, mode),
    );
  }

  writeConsumerFile("conformance.test.ts", CONFORMANCE);
  writeConsumerFile(
    "vitest.config.mjs",
    'export default { test: { include: ["conformance.test.ts"], environment: "node" } };\n',
  );

  process.stdout.write(
    "Running the conformance suites from the published testing entries...\n",
  );

  const conformance = run(
    "pnpm",
    ["exec", "vitest", "run", "--config", "vitest.config.mjs"],
    consumer,
  );

  problems.push(
    ...toProblems("The conformance suites", [
      [
        conformance.status !== 0,
        `fail:\n${conformance.stdout}${conformance.stderr}`,
      ],
    ]),
  );

  writeConsumerFile(
    "smoke.mjs",
    getSmoke(
      Object.fromEntries(
        Object.entries(SURFACES).flatMap(([specifier, names]) =>
          SVELTE_ENTRIES.includes(specifier) ? [] : [[specifier, names]],
        ),
      ),
    ),
  );

  process.stdout.write(
    "Running the packed packages under Node, with no DOM...\n",
  );

  const smoke = run(process.execPath, ["smoke.mjs"], consumer);

  process.stdout.write(smoke.stdout);
  problems.push(
    ...toProblems("The packed packages", [
      [smoke.status !== 0, `fail under Node:\n${smoke.stderr}`],
    ]),
  );

  if (problems.length === 0) {
    packed.forEach(stageRelease);
  }
} catch (error) {
  problems.push(error instanceof Error ? error.message : String(error));
} finally {
  rmSync(consumer, { recursive: true, force: true });
}

if (problems.length > 0) {
  process.stderr.write(
    `${problems.join("\n")}\n${problems.length} problem(s) in the packed packages.\n`,
  );
  process.exit(1);
}

process.stdout.write(
  `Verified ${packages.length} packages. Release artifacts are in .artifacts/release.\n`,
);
