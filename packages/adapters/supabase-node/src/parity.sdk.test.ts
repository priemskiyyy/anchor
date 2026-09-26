import { Anchor } from "@priemskiyyy/anchor";
import { supabase as supabaseClient } from "@priemskiyyy/anchor-supabase";
import { getRequestSession } from "@priemskiyyy/anchor-server";
import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { expect, test } from "vitest";

import {
  createFakeSupabaseAuth,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "src/fakeSupabaseAuth.fixture";
import { supabase } from "src/supabase";

test("one Supabase sign-in is the same principal, user, guest and impersonation to the client adapter and to the server adapter", async () => {
  const auth = createFakeSupabaseAuth();
  const user = auth.createUser("ada");

  // The browser keeps the cookies the browser client writes, and sends them with the next request.
  const cookies = new Map<string, string>();

  const browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (written) => {
        for (const { name, value } of written) {
          cookies.set(name, value);
        }
      },
    },
    global: { fetch: auth.fetch },
    isSingleton: false,
  });

  const { error } = await browserClient.auth.signInWithPassword({
    email: "ada@example.com",
    password: "correct-horse-battery-staple",
  });

  expect(error).toBeNull();

  const anchor = new Anchor({
    adapter: supabaseClient({ sdk: browserClient }),
  });

  await anchor.start();

  const state = anchor.session.get();

  if (state.status !== "signed-in") {
    throw new Error("Expected a session.");
  }

  const { state: requestState } = await getRequestSession(
    new Request("https://app.example.com/", {
      headers: {
        cookie: [...cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
      },
    }),
    {
      adapter: supabase({
        sdk: (serverCookies) =>
          createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            cookies: serverCookies,
            global: { fetch: auth.fetch },
          }),
      }),
    },
  );

  expect(state.session.principal).toEqual({
    authority: "supabase",
    subject: user.id,
    tenant: null,
  });
  expect(requestState).toEqual({
    status: "signed-in",
    session: {
      principal: state.session.principal,
      user: state.session.user,
      guest: state.session.guest,
      impersonated: state.session.impersonated,
    },
  });
  anchor.dispose();
});
