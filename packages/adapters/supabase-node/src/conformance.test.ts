import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";
import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";

import {
  createFakeSupabaseAuth,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "src/fakeSupabaseAuth.fixture";
import {
  AUTH_COOKIE,
  createFakeSupabaseServer,
} from "src/fakeSupabaseServer.fixture";
import { supabase } from "src/supabase";

testServerSessionAdapter({
  name: "supabase-node over the fake server client",
  createFixture: () => {
    const fake = createFakeSupabaseServer();

    return {
      adapter: supabase({ sdk: fake.sdk }),
      native: fake.sdk,
      signIn: (name) => {
        fake.signIn(`token_${name}`, `user_${name}`);

        return {
          headers: new Headers({ cookie: `${AUTH_COOKIE}=token_${name}` }),
          subject: `user_${name}`,
        };
      },
      signOut: (headers) => {
        fake.endSession(
          (headers.get("cookie") ?? "").slice(`${AUTH_COOKIE}=`.length),
        );
      },
    };
  },
});

testServerSessionAdapter({
  name: "supabase-node over the real @supabase/ssr server client",
  createFixture: () => {
    const auth = createFakeSupabaseAuth();

    const sdk = (cookies: CookieMethodsServer) =>
      createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies,
        global: { fetch: auth.fetch },
      });

    return {
      adapter: supabase({ sdk }),
      native: sdk,
      signIn: async (name) => {
        const { user, cookie } = await auth.signUp(name);

        return { headers: new Headers({ cookie }), subject: user.id };
      },
      signOut: async (headers) => {
        await auth.signOut(headers.get("cookie") ?? "");
      },
    };
  },
});
