import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import { createClient } from "@workos-inc/authkit-js";
import type { User } from "@workos-inc/authkit-js";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import type { WorkosClientLike } from "src/types/WorkosClientLike";
import type { WorkosSessionUser } from "src/types/WorkosSessionUser";
import type { WorkosUserOf } from "src/types/WorkosUserOf";
import { workos } from "src/workos";
import { workosRefreshes } from "src/workosRefreshes";

type Client = Awaited<ReturnType<typeof createClient>>;

declare const client: Client;

const refreshes = workosRefreshes();

expectTypeOf(client).toExtend<WorkosClientLike>();
expectTypeOf<WorkosUserOf<Client>>().toEqualTypeOf<User>();

export const created = createClient("client_anchor", {
  onRefresh: refreshes.handleRefresh,
  onRefreshFailure: refreshes.handleRefreshFailure,
});

const adapter = workos({
  sdk: client,
  refreshes,
  tokens: { api: accessToken(), reports: accessToken() },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<WorkosSessionUser, Client, "api" | "reports">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Client>();

const mapped = workos({
  sdk: client,
  refreshes,
  user: (user) => {
    expectTypeOf(user).toEqualTypeOf<User>();

    return { id: user.id, email: user.email };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ id: string; email: string }, Client, never>
>();

// @ts-expect-error The adapter takes the client, not the promise createClient() returns.
export const wrongSdk = workos({ sdk: created, refreshes });

// @ts-expect-error The client reports its refreshes only through the callbacks it was created with, so the adapter needs them.
export const withoutRefreshes = workos({ sdk: client });

export const wrongProfile = workos({
  sdk: client,
  refreshes,
  // @ts-expect-error AuthKit mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
