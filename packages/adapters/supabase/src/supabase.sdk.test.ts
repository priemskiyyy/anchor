import { Anchor } from "@priemskiyyy/anchor";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "vitest";

import { accessToken } from "src/accessToken";
import { supabase } from "src/supabase";

test("the real supabase-js client, with no stored session, resolves as signed out and unsubscribes on dispose", async () => {
  const client = createClient("http://127.0.0.1:54321", "anchor-anon-key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const anchor = new Anchor({
    adapter: supabase({ sdk: client, tokens: { api: accessToken() } }),
  });

  await anchor.start();

  expect(anchor.native).toBe(client);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  await anchor.sync();

  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});
