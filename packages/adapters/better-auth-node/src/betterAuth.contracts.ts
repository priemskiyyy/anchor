import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { betterAuth as createAuthServer } from "better-auth";
import { createAuthClient } from "better-auth/client";
import { admin, anonymous, organization } from "better-auth/plugins";
import { expectTypeOf } from "vitest";

import { betterAuth } from "src/betterAuth";
import type { BetterAuthServerLike } from "src/types/BetterAuthServerLike";
import type { BetterAuthSessionUser } from "src/types/BetterAuthSessionUser";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";

const auth = createAuthServer({
  plugins: [organization(), anonymous(), admin()],
});

type Server = typeof auth;

expectTypeOf(auth).toExtend<BetterAuthServerLike>();
expectTypeOf<BetterAuthUserOf<Server>>().toEqualTypeOf<
  Server["$Infer"]["Session"]["user"]
>();

expectTypeOf(betterAuth({ sdk: auth })).toEqualTypeOf<
  ServerSessionAdapter<BetterAuthSessionUser, Server>
>();

const mapped = betterAuth({
  sdk: auth,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<Server["$Infer"]["Session"]["user"]>();

    return { id: user.id, role: user.role };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  ServerSessionAdapter<{ id: string; role: string | null | undefined }, Server>
>();

// @ts-expect-error The server adapter takes the server's auth instance, not the client.
export const wrongSdk = betterAuth({ sdk: createAuthClient({}) });
