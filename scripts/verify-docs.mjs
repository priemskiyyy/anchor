import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const root = fileURLToPath(new URL("../", import.meta.url));
const relative = (file) => path.relative(root, file);

// The sidebar's own groups, flattened. A page outside this list is
// unreachable from the sidebar, and a sidebar entry with no page here is a
// dead link the moment it ships.
const CANONICAL_PAGES = [
  "index.md",
  "getting-started.md",
  "session-state.md",
  "session-identity.md",
  "token-profiles.md",
  "ending-a-session.md",
  "react.md",
  "vue.md",
  "solid.md",
  "svelte.md",
  "react-native.md",
  "browser-lifecycle.md",
  "server-rendering.md",
  "adapters.md",
  "adapters/firebase.md",
  "adapters/firebase-react-native.md",
  "adapters/firebase-node.md",
  "adapters/supabase.md",
  "adapters/supabase-node.md",
  "adapters/auth0.md",
  "adapters/auth0-react-native.md",
  "adapters/better-auth.md",
  "adapters/better-auth-node.md",
  "adapters/clerk.md",
  "adapters/clerk-node.md",
  "adapters/workos.md",
  "adapters/workos-node.md",
  "adapters/authjs.md",
  "adapters/msal.md",
  "adapters/amplify.md",
  "adapters/oidc.md",
  "adapters/keycloak.md",
  "adapters/okta.md",
  "adapters/http.md",
  "writing-an-adapter.md",
  "migrating-between-providers.md",
  "silo.md",
  "simulcast.md",
  "errors.md",
  "race-conditions.md",
  "security.md",
  "devtools.md",
  "testing.md",
  "verification.md",
  "internals/architecture.md",
];

// The page that documents each package that is not an adapter. An adapter's
// page is adapters/<its directory>.md.
const PACKAGE_PAGES = {
  core: "getting-started.md",
  react: "react.md",
  vue: "vue.md",
  solid: "solid.md",
  svelte: "svelte.md",
  "react-native": "react-native.md",
  browser: "browser-lifecycle.md",
  server: "server-rendering.md",
  devtools: "devtools.md",
};

const markdownFiles = (directory) =>
  existsSync(directory)
    ? readdirSync(directory, { recursive: true })
        .filter((entry) => entry.endsWith(".md"))
        .map((entry) => path.join(directory, entry))
    : [];

const readmesUnder = (group) =>
  existsSync(path.join(root, group))
    ? readdirSync(path.join(root, group))
        .map((directory) => path.join(root, group, directory, "README.md"))
        .filter(existsSync)
    : [];

const docsPages = markdownFiles(path.join(root, "docs")).filter(
  (file) => !relative(file).startsWith("docs/.vitepress/"),
);

const sources = [
  ...docsPages,
  ...["packages", "packages/adapters", "examples"].flatMap(readmesUnder),
  ...[
    "README.md",
    "CONTRIBUTING.md",
    "RELEASING.md",
    "SUPPORT.md",
    "CHANGELOG.md",
  ].map((file) => path.join(root, file)),
].filter(existsSync);

const pages = docsPages.map((file) =>
  path.relative(path.join(root, "docs"), file),
);

// Every package, found by its package.json so a new one is never missed, needs
// a page that names it.
const undocumented = ["packages", "packages/adapters"].flatMap((group) =>
  readdirSync(path.join(root, group)).flatMap((directory) => {
    const manifestPath = path.join(root, group, directory, "package.json");

    if (!existsSync(manifestPath)) {
      return [];
    }

    const { name } = JSON.parse(readFileSync(manifestPath, "utf8"));

    const page =
      group === "packages/adapters"
        ? `adapters/${directory}.md`
        : PACKAGE_PAGES[directory];

    if (page === undefined) {
      return [`${group}/${directory} (${name}) has no page in PACKAGE_PAGES`];
    }

    const file = path.join(root, "docs", page);

    if (!existsSync(file)) {
      return [`${group}/${directory} (${name}) has no page docs/${page}`];
    }

    if (!readFileSync(file, "utf8").includes(`\`${name}\``)) {
      return [`docs/${page} never names ${name}`];
    }

    return [];
  }),
);

assert.deepEqual(
  undocumented,
  [],
  `Every package needs its page:\n  ${undocumented.join("\n  ")}\n`,
);

const uncanonical = pages.filter((page) => !CANONICAL_PAGES.includes(page));

assert.deepEqual(
  uncanonical,
  [],
  `These pages are missing from the sidebar's canonical list: ${uncanonical.join(", ")}`,
);

const unwritten = CANONICAL_PAGES.filter((page) => !pages.includes(page));

assert.deepEqual(
  unwritten,
  [],
  `These sidebar entries have no page: ${unwritten.join(", ")}`,
);

// Every miss is collected rather than thrown at the first one: a single dead
// link per run turns fixing a set of them into a set of round trips.
const broken = [];
let checked = 0;

for (const file of sources) {
  const markdown = readFileSync(file, "utf8");

  if (relative(file).startsWith("docs/")) {
    const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";

    assert.match(
      frontmatter,
      /^description: "[^"\n]+"$/m,
      `${relative(file)}: missing frontmatter description`,
    );
  }

  // A regex literal here would round-trip through Prettier as the character
  // itself, so the ban is written as a code point comparison instead.
  assert.equal(
    markdown.includes(String.fromCharCode(0x2014)),
    false,
    `${relative(file)}: the project writes without em dashes`,
  );

  // Inline links and images only. Code fences are left alone because a link
  // inside one is sample text rather than navigation.
  const prose = markdown.replace(/```[\s\S]*?```/g, "");

  for (const [, source] of prose.matchAll(/<img\b[^>]*\ssrc="([^"\n]+)"/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(source)) {
      continue;
    }

    assert.ok(
      existsSync(path.resolve(path.dirname(file), source)),
      `${relative(file)}: missing image ${source}`,
    );
  }

  for (const [, target] of prose.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) {
      continue;
    }

    checked += 1;

    const [pathname] = target.split("#");

    if (pathname === "") {
      continue;
    }

    if (existsSync(path.resolve(path.dirname(file), pathname))) {
      continue;
    }

    broken.push(`${relative(file)} -> ${target}`);
  }
}

assert.deepEqual(
  broken,
  [],
  `Dead relative links:\n  ${broken.join("\n  ")}\n`,
);
console.log(
  `Verified ${checked} relative links across ${sources.length} markdown sources, and a page for every package.`,
);

const output = path.join(root, "docs/.vitepress/dist");
const siteUrl = process.env.DOCS_SITE_URL;

const base =
  process.env.DOCS_BASE_PATH ?? (siteUrl ? new URL(siteUrl).pathname : "/");

const files = existsSync(output)
  ? readdirSync(output, { recursive: true }).filter(
      // The hosted Session Lab under demo/ is an application, not a page of the site.
      (file) =>
        file.endsWith(".html") &&
        file !== "404.html" &&
        !file.startsWith("demo/"),
    )
  : [];

assert.ok(files.length > 0, "Build the documentation before verifying it");
assert.equal(
  files.length,
  pages.length,
  "The build must produce one page per markdown source",
);
assert.ok(
  existsSync(path.join(output, "demo/index.html")),
  "The hosted Session Lab is missing: build:docs builds it into demo/",
);

const pageIds = new Map();

for (const file of files) {
  const dom = new JSDOM(readFileSync(path.join(output, file), "utf8"));

  pageIds.set(
    file,
    new Set(
      Array.from(
        dom.window.document.querySelectorAll("[id]"),
        (element) => element.id,
      ),
    ),
  );
  dom.window.close();
}

for (const file of files) {
  const dom = new JSDOM(readFileSync(path.join(output, file), "utf8"));
  const document = dom.window.document;

  const meta = (selector) =>
    document.querySelector(selector)?.getAttribute("content");

  assert.ok(document.title.includes("Anchor"), `${file}: missing page title`);
  assert.equal(
    document.querySelectorAll("h1").length,
    1,
    `${file}: expected one main heading`,
  );
  assert.equal(
    document.querySelectorAll("main").length,
    1,
    `${file}: expected one main landmark`,
  );

  const origin = new URL(siteUrl ?? "https://docs.local").origin;
  const currentUrl = new URL(`${base}${file}`, origin);

  for (const link of document.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    const target = new URL(href, currentUrl);

    if (target.origin !== origin) {
      continue;
    }

    if (/^https?:\/\//i.test(href) && !target.pathname.startsWith(base)) {
      continue;
    }

    assert.ok(
      target.pathname.startsWith(base),
      `${file}: link escapes the configured base: ${target.pathname}`,
    );

    const route = decodeURIComponent(target.pathname.slice(base.length));

    const targetFile =
      route.endsWith("/") || route === ""
        ? `${route}index.html`
        : path.extname(route)
          ? route
          : `${route}.html`;

    assert.ok(
      existsSync(path.join(output, targetFile)),
      `${file}: missing link target ${targetFile}`,
    );

    if (target.hash && pageIds.has(targetFile)) {
      assert.ok(
        pageIds.get(targetFile).has(decodeURIComponent(target.hash.slice(1))),
        `${file}: missing anchor ${targetFile}${target.hash}`,
      );
    }
  }

  assert.ok(meta('meta[name="description"]'), `${file}: missing description`);

  for (const property of ["og:title", "og:description"]) {
    assert.ok(
      meta(`meta[property="${property}"]`),
      `${file}: missing ${property}`,
    );
  }

  for (const image of document.querySelectorAll("img")) {
    assert.ok(image.hasAttribute("alt"), `${file}: image is missing alt text`);
  }

  const icon = document.querySelector('link[rel="icon"]')?.getAttribute("href");

  assert.ok(
    icon?.startsWith(base),
    `${file}: missing icon under the configured base`,
  );
  assert.ok(
    existsSync(path.join(output, icon.slice(base.length))),
    `${file}: missing icon file`,
  );

  if (siteUrl) {
    const expected = new URL(
      file.replace(/(^|\/)index\.html$/, "$1").replace(/\.html$/, ""),
      `${siteUrl.replace(/\/$/, "")}/`,
    ).href;

    assert.equal(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href"),
      expected,
      `${file}: incorrect canonical URL`,
    );
    assert.equal(
      meta('meta[property="og:url"]'),
      expected,
      `${file}: incorrect Open Graph URL`,
    );
  }

  dom.window.close();
}

// llms.txt lists every page but the introduction with its title, URL and
// description, and llms-full.txt carries every one of them whole, so neither
// can lag behind a page.
const llmsOrigin = siteUrl
  ? siteUrl.replace(/\/$/, "")
  : base.replace(/\/$/, "");

const llms = readFileSync(path.join(output, "llms.txt"), "utf8");
const llmsFull = readFileSync(path.join(output, "llms-full.txt"), "utf8");
const listed = pages.filter((page) => page !== "index.md");

assert.ok(llms.startsWith("# Anchor\n"), "llms.txt must start with # Anchor");
assert.equal(
  llms.split("\n").filter((line) => line.startsWith("- [")).length,
  listed.length,
  "llms.txt must list every page but the introduction once",
);

for (const page of listed) {
  const source = readFileSync(path.join(root, "docs", page), "utf8");
  const title = source.match(/^# (.+)$/m)?.[1];
  const summary = source.match(/^description: "(.+)"$/m)?.[1];
  const url = `${llmsOrigin}/${page.replace(/\.md$/, "")}`;

  assert.ok(
    llms.includes(`- [${title}](${url}): ${summary}\n`),
    `llms.txt: missing or stale entry for docs/${page}`,
  );
  assert.ok(
    llmsFull.includes(`<!-- ${url} -->\n${source.trim()}`),
    `llms-full.txt: missing or stale docs/${page}`,
  );
}

if (siteUrl) {
  const robots = readFileSync(path.join(output, "robots.txt"), "utf8");

  const sitemapUrl = new URL("sitemap.xml", `${siteUrl.replace(/\/$/, "")}/`)
    .href;

  assert.ok(
    robots.includes(`Sitemap: ${sitemapUrl}`),
    "robots.txt must link to the deployed sitemap",
  );
  assert.ok(
    existsSync(path.join(output, "sitemap.xml")),
    "Missing sitemap.xml",
  );
}

console.log(
  `Verified titles, headings, links, anchors, metadata and llms.txt for ${files.length} documentation pages.`,
);
