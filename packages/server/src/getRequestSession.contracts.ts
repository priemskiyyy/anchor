import type { SessionAdapter } from "@priemskiyyy/anchor";
import { expectTypeOf } from "vitest";

import { getRequestSession } from "src/getRequestSession";
import { getSessionHydration } from "src/getSessionHydration";
import type { RequestSessionState } from "src/types/RequestSessionState";
import type { ServerSessionAdapter } from "src/types/ServerSessionAdapter";
import type { SessionHydration } from "src/types/SessionHydration";

type User = { id: string; name: string };

declare const adapter: ServerSessionAdapter<User, { api: unknown }>;
declare const clientAdapter: SessionAdapter<User, null, "api">;

export const renderPage = async (request: Request) => {
  const { state, headers } = await getRequestSession(request, { adapter });

  expectTypeOf(state).toEqualTypeOf<RequestSessionState<User>>();
  expectTypeOf(headers).toEqualTypeOf<Headers>();

  if (state.status === "signed-in") {
    expectTypeOf(state.session.user).toEqualTypeOf<User>();
    // @ts-expect-error A request's session mints nothing: tokens belong to the client's Anchor.
    state.session.getToken("api");
  }

  const hydration = getSessionHydration(state, {
    select: ({ user }) => ({ name: user.name }),
  });

  expectTypeOf(hydration).toEqualTypeOf<SessionHydration<{ name: string }>>();

  return hydration;
};

export const readHeadersAlone = (headers: Headers) =>
  // @ts-expect-error A read takes the request's URL and method too: a provider that redirects needs them.
  getRequestSession({ headers }, { adapter });

export const readWithClientAdapter = (request: Request) =>
  // @ts-expect-error A client adapter observes one provider for a whole application, so it cannot read one request.
  getRequestSession(request, { adapter: clientAdapter });
