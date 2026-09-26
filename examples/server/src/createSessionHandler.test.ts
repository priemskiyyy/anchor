import { expect, test } from "vitest";

import { createAuthServer } from "src/createAuthServer";
import { createSessionHandler } from "src/createSessionHandler";
import { SERVER_ORIGIN } from "src/utils/constants/server";

const startServer = () => {
  const auth = createAuthServer();

  return { auth, handleRequest: createSessionHandler(auth) };
};

type SessionServer = ReturnType<typeof startServer>;

// The cookie header a browser would send back after the response that set these cookies.
const getCookieHeader = (response: Response) =>
  response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

const signUp = async ({ handleRequest }: SessionServer, name: string) => {
  const response = await handleRequest(
    new Request(`${SERVER_ORIGIN}/sign-up`, {
      method: "POST",
      body: new URLSearchParams({ name }),
    }),
  );

  return { response, cookie: getCookieHeader(response) };
};

const getPage = ({ handleRequest }: SessionServer, cookie?: string) =>
  handleRequest(
    new Request(`${SERVER_ORIGIN}/`, {
      headers: cookie === undefined ? {} : { cookie },
    }),
  );

const readPage = async (response: Response) => {
  const html = await response.text();

  return {
    html,
    summary: /<p id="session-summary">(.*?)<\/p>/.exec(html)?.[1],
    hydration:
      /<script type="application\/json" id="session-hydration">(.*?)<\/script>/.exec(
        html,
      )?.[1],
  };
};

test("a request without a session cookie renders signed out, and Better Auth's own headers go out with the page", async () => {
  const response = await getPage(startServer());
  const page = await readPage(response);

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(page.summary).toBe("Signed out.");
  expect(page.hydration).toBe('{"status":"signed-out"}');
});

test("after a sign-up, the visitor's own cookie renders them signed in, and the hydration carries their name and nothing else", async () => {
  const server = startServer();
  const signedUp = await signUp(server, "Ada");

  expect(signedUp.response.status).toBe(303);
  expect(signedUp.response.headers.get("location")).toBe("/");
  expect(signedUp.cookie).toMatch(/^better-auth\.session_token=/);

  const page = await readPage(await getPage(server, signedUp.cookie));
  const token = signedUp.cookie.split("=")[1] ?? "missing";

  expect(page.summary).toBe("Signed in as Ada.");
  expect(page.hydration).toBe('{"status":"signed-in","user":{"name":"Ada"}}');
  expect(page.html).not.toContain(decodeURIComponent(token).split(".")[0]);
  expect(page.html).not.toContain("@example.com");
});

test("two visitors' requests read at the same time each see their own session, and a third without a cookie sees none", async () => {
  const server = startServer();
  const ada = await signUp(server, "Ada");
  const grace = await signUp(server, "Grace");

  const pages = await Promise.all(
    [
      getPage(server, ada.cookie),
      getPage(server, grace.cookie),
      getPage(server),
    ].map(async (response) => (await readPage(await response)).hydration),
  );

  expect(pages).toEqual([
    '{"status":"signed-in","user":{"name":"Ada"}}',
    '{"status":"signed-in","user":{"name":"Grace"}}',
    '{"status":"signed-out"}',
  ]);
});

test("a cookie whose session ended elsewhere reads as signed out, and Better Auth's deletion of that cookie is passed on", async () => {
  const server = startServer();
  const ada = await signUp(server, "Ada");

  await server.auth.api.signOut({
    headers: new Headers({ cookie: ada.cookie }),
  });

  const response = await getPage(server, ada.cookie);

  expect((await readPage(response)).summary).toBe("Signed out.");
  expect(response.headers.getSetCookie()).toEqual([
    "better-auth.session_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    "better-auth.session_data=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
    "better-auth.dont_remember=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax",
  ]);
});

test("the sign-out form ends only the visitor's own session and passes the cookie deletion on", async () => {
  const server = startServer();
  const ada = await signUp(server, "Ada");
  const grace = await signUp(server, "Grace");

  const response = await server.handleRequest(
    new Request(`${SERVER_ORIGIN}/sign-out`, {
      method: "POST",
      headers: { cookie: ada.cookie },
    }),
  );

  expect(response.status).toBe(303);
  expect(response.headers.getSetCookie()).toContainEqual(
    expect.stringMatching(/^better-auth\.session_token=;/),
  );
  expect((await readPage(await getPage(server, ada.cookie))).summary).toBe(
    "Signed out.",
  );
  expect((await readPage(await getPage(server, grace.cookie))).summary).toBe(
    "Signed in as Grace.",
  );
});

test("a name is escaped on the page and in the hydration, so it cannot add markup", async () => {
  const server = startServer();
  const visitor = await signUp(server, "</script><b>Mallory</b>");
  const page = await readPage(await getPage(server, visitor.cookie));

  expect(page.summary).toBe(
    "Signed in as &lt;/script&gt;&lt;b&gt;Mallory&lt;/b&gt;.",
  );
  expect(page.hydration).toBe(
    '{"status":"signed-in","user":{"name":"\\u003c/script>\\u003cb>Mallory\\u003c/b>"}}',
  );
  expect(page.html).not.toContain("<b>Mallory");
});

test("a post from another site is refused before Better Auth sees it, and an unknown route answers 404", async () => {
  const server = startServer();

  const refused = await server.handleRequest(
    new Request(`${SERVER_ORIGIN}/sign-up`, {
      method: "POST",
      headers: { origin: "https://elsewhere.example" },
      body: new URLSearchParams({ name: "Ada" }),
    }),
  );

  expect(refused.status).toBe(403);
  expect(refused.headers.getSetCookie()).toEqual([]);
  expect(
    (await server.handleRequest(new Request(`${SERVER_ORIGIN}/missing`)))
      .status,
  ).toBe(404);
});
