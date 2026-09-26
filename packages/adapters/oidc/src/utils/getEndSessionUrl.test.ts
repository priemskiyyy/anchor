import { expect, test } from "vitest";

import { getEndSessionUrl } from "src/utils/getEndSessionUrl";

const ENDPOINT = "https://id.example.com/logout";

test("the page names the ID token as its hint, where to return and the client's extra parameters, in that order", () => {
  expect(
    getEndSessionUrl(ENDPOINT, "id-token", {
      client_id: "anchor-client",
      post_logout_redirect_uri: "https://app.example.com/goodbye",
      extraQueryParams: { audience: "api", prompt: true },
    }),
  ).toBe(
    `${ENDPOINT}?id_token_hint=id-token&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye&audience=api&prompt=true`,
  );
});

test("without an ID token the page names the client, so the provider can accept the return address", () => {
  expect(
    getEndSessionUrl(ENDPOINT, undefined, {
      client_id: "anchor-client",
      post_logout_redirect_uri: "https://app.example.com/goodbye",
      extraQueryParams: {},
    }),
  ).toBe(
    `${ENDPOINT}?client_id=anchor-client&post_logout_redirect_uri=https%3A%2F%2Fapp.example.com%2Fgoodbye`,
  );
});

test("without an ID token or a return address the page is the endpoint as the provider published it", () => {
  expect(
    getEndSessionUrl(`${ENDPOINT}?tenant=acme`, undefined, {
      client_id: "anchor-client",
      extraQueryParams: {},
    }),
  ).toBe(`${ENDPOINT}?tenant=acme`);
});
