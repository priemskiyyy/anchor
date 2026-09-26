import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const siteUrl = process.env.DOCS_SITE_URL;

const repositoryUrl =
  process.env.DOCS_REPOSITORY_URL ?? "https://github.com/priemskiyyy/anchor";

const base =
  process.env.DOCS_BASE_PATH ?? (siteUrl ? new URL(siteUrl).pathname : "/");

const description =
  "Provider-independent session state for TypeScript. One typed, reactive, race-safe view of the current session over Firebase, Supabase, Auth0, Better Auth, Clerk, Microsoft Entra ID, Amazon Cognito, WorkOS, Auth.js, any OpenID Connect provider or your own backend, with tokens and endings bound to the session they belong to.";

// llms.txt lists every guide with its description; llms-full.txt inlines them.
const writeLlmsText = async (srcDir: string, outDir: string) => {
  const origin = siteUrl ? siteUrl.replace(/\/$/, "") : base.replace(/\/$/, "");

  const files = (await readdir(srcDir, { recursive: true }))
    .filter((file) => file.endsWith(".md"))
    .filter((file) => !file.startsWith(".vitepress"))
    .filter((file) => file !== "README.md" && file !== "index.md")
    .sort();

  const pages = await Promise.all(
    files.map(async (file) => {
      const source = await readFile(join(srcDir, file), "utf8");
      const title = source.match(/^# (.+)$/m)?.[1] ?? file;
      const summary = source.match(/^description: "(.+)"$/m)?.[1] ?? "";
      const url = `${origin}/${file.replace(/\.md$/, "")}`;

      return { title, summary, url, source };
    }),
  );

  const index = [
    "# Anchor",
    "",
    `> ${description}`,
    "",
    "## Docs",
    "",
    ...pages.map(
      ({ title, summary, url }) => `- [${title}](${url}): ${summary}`,
    ),
    "",
  ].join("\n");

  const full = pages
    .map(({ url, source }) => `<!-- ${url} -->\n${source.trim()}`)
    .join("\n\n---\n\n");

  await writeFile(join(outDir, "llms.txt"), index);
  await writeFile(join(outDir, "llms-full.txt"), `${full}\n`);
};

export default defineConfig({
  base,
  lang: "en-US",
  title: "Anchor",
  description,
  head: [
    [
      "link",
      { rel: "icon", type: "image/svg+xml", href: `${base}favicon.svg` },
    ],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Anchor" }],
    ["meta", { name: "twitter:card", content: "summary" }],
    ["meta", { name: "theme-color", content: "#0369a1" }],
  ],
  ...(siteUrl ? { sitemap: { hostname: siteUrl } } : {}),
  vite: {
    resolve: {
      alias: { src: fileURLToPath(new URL(".", import.meta.url)) },
    },
  },
  buildEnd: async ({ outDir, srcDir }) => {
    const sitemap = siteUrl
      ? `Sitemap: ${new URL("sitemap.xml", `${siteUrl.replace(/\/$/, "")}/`).href}\n`
      : "";

    await writeFile(
      join(outDir, "robots.txt"),
      `User-agent: *\nAllow: /\n${sitemap}`,
    );
    await writeLlmsText(srcDir, outDir);
  },
  transformHead: ({ pageData }) => {
    const title =
      pageData.title === "Anchor" ? "Anchor" : `${pageData.title} | Anchor`;

    const head: [string, Record<string, string>][] = [
      ["meta", { property: "og:title", content: title }],
      [
        "meta",
        {
          property: "og:description",
          content: pageData.description || description,
        },
      ],
      ["meta", { name: "twitter:title", content: title }],
      [
        "meta",
        {
          name: "twitter:description",
          content: pageData.description || description,
        },
      ],
    ];

    // Without a site URL the build omits canonical URLs rather than assume a host.
    if (!siteUrl) {
      return head;
    }

    const pagePath = pageData.relativePath
      .replace(/(^|\/)index\.md$/, "$1")
      .replace(/\.md$/, "");

    const url = new URL(pagePath, `${siteUrl.replace(/\/$/, "")}/`).href;

    head.push(
      ["link", { rel: "canonical", href: url }],
      ["meta", { property: "og:url", content: url }],
    );

    return head;
  },
  srcExclude: ["README.md"],
  ignoreDeadLinks: [
    // The hosted Session Lab is copied into dist/demo after the site builds.
    /^\/demo\//,
  ],
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    socialLinks: repositoryUrl ? [{ icon: "github", link: repositoryUrl }] : [],
    ...(repositoryUrl
      ? {
          editLink: { pattern: `${repositoryUrl}/edit/main/docs/:path` },
        }
      : {}),
    nav: [
      { text: "Guide", link: "/getting-started" },
      { text: "Adapters", link: "/adapters" },
      {
        text: "Frameworks",
        items: [
          { text: "React", link: "/react" },
          { text: "Vue", link: "/vue" },
          { text: "Solid", link: "/solid" },
          { text: "Svelte", link: "/svelte" },
          { text: "React Native and Expo", link: "/react-native" },
          { text: "Server and SSR", link: "/server-rendering" },
        ],
      },
      { text: "Devtools", link: "/devtools" },
      // A full page load: the lab is an application of its own, not a page of the site.
      { text: "Session Lab", link: "/demo/", target: "_self" },
      {
        text: "Reference",
        items: [
          { text: "Errors", link: "/errors" },
          { text: "Writing an adapter", link: "/writing-an-adapter" },
          { text: "Verification matrix", link: "/verification" },
          { text: "Runtime architecture", link: "/internals/architecture" },
        ],
      },
    ],
    sidebar: [
      {
        text: "Start here",
        items: [
          { text: "What Anchor is", link: "/" },
          { text: "Getting started", link: "/getting-started" },
          { text: "Session state", link: "/session-state" },
          {
            text: "Session identity and session.key",
            link: "/session-identity",
          },
          { text: "Token profiles", link: "/token-profiles" },
          { text: "Ending a session", link: "/ending-a-session" },
        ],
      },
      {
        text: "Frameworks and runtimes",
        items: [
          { text: "React", link: "/react" },
          { text: "Vue", link: "/vue" },
          { text: "Solid", link: "/solid" },
          { text: "Svelte", link: "/svelte" },
          { text: "React Native and Expo", link: "/react-native" },
          { text: "Browser lifecycle", link: "/browser-lifecycle" },
          { text: "Server and SSR", link: "/server-rendering" },
        ],
      },
      {
        text: "Adapters",
        items: [
          { text: "Choose an adapter", link: "/adapters" },
          { text: "Firebase", link: "/adapters/firebase" },
          {
            text: "Firebase on React Native",
            link: "/adapters/firebase-react-native",
          },
          { text: "Firebase on the server", link: "/adapters/firebase-node" },
          { text: "Supabase", link: "/adapters/supabase" },
          { text: "Supabase on the server", link: "/adapters/supabase-node" },
          { text: "Auth0", link: "/adapters/auth0" },
          {
            text: "Auth0 on React Native",
            link: "/adapters/auth0-react-native",
          },
          { text: "Better Auth", link: "/adapters/better-auth" },
          {
            text: "Better Auth on the server",
            link: "/adapters/better-auth-node",
          },
          { text: "Clerk", link: "/adapters/clerk" },
          { text: "Clerk on the server", link: "/adapters/clerk-node" },
          { text: "WorkOS AuthKit", link: "/adapters/workos" },
          { text: "WorkOS on the server", link: "/adapters/workos-node" },
          { text: "Auth.js", link: "/adapters/authjs" },
          { text: "Microsoft Entra ID (MSAL)", link: "/adapters/msal" },
          { text: "Amazon Cognito (Amplify)", link: "/adapters/amplify" },
          { text: "OpenID Connect", link: "/adapters/oidc" },
          { text: "Keycloak", link: "/adapters/keycloak" },
          { text: "Okta", link: "/adapters/okta" },
          { text: "Your own backend (HTTP)", link: "/adapters/http" },
          { text: "Writing an adapter", link: "/writing-an-adapter" },
          {
            text: "Migrating between providers",
            link: "/migrating-between-providers",
          },
        ],
      },
      {
        text: "Integrations",
        items: [
          { text: "Silo", link: "/silo" },
          { text: "Simulcast", link: "/simulcast" },
        ],
      },
      {
        text: "Guarantees and debugging",
        items: [
          { text: "Errors", link: "/errors" },
          { text: "Race conditions and guarantees", link: "/race-conditions" },
          { text: "Security model", link: "/security" },
          { text: "Diagnostics and devtools", link: "/devtools" },
          { text: "Testing", link: "/testing" },
          { text: "Verification matrix", link: "/verification" },
        ],
      },
      {
        text: "Reference",
        items: [
          { text: "Runtime architecture", link: "/internals/architecture" },
        ],
      },
    ],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: { message: "Released under the MIT License." },
  },
});
