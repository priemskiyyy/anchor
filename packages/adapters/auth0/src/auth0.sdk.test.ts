// @vitest-environment jsdom
import { Anchor } from "@priemskiyyy/anchor";
import { Auth0Client } from "@auth0/auth0-spa-js";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { auth0 } from "src/auth0";

test("the real auth0-spa-js client, with nothing cached, resolves as signed out and ends nothing", async () => {
  const client = new Auth0Client({
    domain: "anchor-demo.us.auth0.com",
    clientId: "anchor-client",
    cacheLocation: "memory",
  });

  const anchor = new Anchor({
    adapter: auth0({
      sdk: client,
      tokens: { api: accessToken({ audience: "https://api.example.com" }) },
    }),
  });

  await anchor.start();

  expect(anchor.native).toBe(client);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});
