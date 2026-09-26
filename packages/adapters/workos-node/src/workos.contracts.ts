import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";
import { createClient } from "@workos-inc/authkit-js";
import { WorkOS } from "@workos-inc/node";
import type { CookieSession, User } from "@workos-inc/node";
import { expectTypeOf } from "vitest";

import type { createFakeWorkos } from "src/fakeWorkos.fixture";
import type { WorkosLike } from "src/types/WorkosLike";
import type { WorkosSealedSessionLike } from "src/types/WorkosSealedSessionLike";
import type { WorkosSessionUser } from "src/types/WorkosSessionUser";
import type { WorkosUserOf } from "src/types/WorkosUserOf";
import { workos } from "src/workos";

type FakeSdk = ReturnType<typeof createFakeWorkos>["sdk"];

const client = new WorkOS("sk_test_anchor", { clientId: "client_anchor" });

expectTypeOf(client).toExtend<WorkosLike>();
expectTypeOf<CookieSession>().toExtend<WorkosSealedSessionLike>();
expectTypeOf<FakeSdk>().toExtend<WorkosLike>();
expectTypeOf<WorkosUserOf<WorkOS>>().toEqualTypeOf<User>();

expectTypeOf(workos({ sdk: client, cookiePassword: "password" })).toEqualTypeOf<
  ServerSessionAdapter<WorkosSessionUser, WorkOS>
>();

const mapped = workos({
  sdk: client,
  cookiePassword: "password",
  cookie: "session",
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.id, metadata: user.metadata };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  ServerSessionAdapter<{ id: string; metadata: Record<string, string> }, WorkOS>
>();

export const withoutPassword = workos(
  // @ts-expect-error A sealed session opens only with the password it was sealed with.
  { sdk: client },
);

export const authkitClient = workos({
  // @ts-expect-error The server adapter takes @workos-inc/node's client, not AuthKit's browser client.
  sdk: await createClient("client_anchor"),
  cookiePassword: "password",
});
