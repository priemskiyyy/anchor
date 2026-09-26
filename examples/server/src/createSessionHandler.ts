import { betterAuth } from "@priemskiyyy/anchor-better-auth-node";
import {
  getRequestSession,
  getSessionHydration,
} from "@priemskiyyy/anchor-server";

import { renderSessionPage } from "src/renderSessionPage";
import type { AuthServer } from "src/types/AuthServer";
import { getVisitorName } from "src/utils/getVisitorName";

const getRedirectHome = (headers: Headers) => {
  const redirect = new Headers(headers);

  redirect.set("location", "/");

  return new Response(null, { status: 303, headers: redirect });
};

/**
 * The server's one handler, in the Fetch API's shape. The page reads each
 * request's own session through Anchor; the two forms sign a visitor up or
 * out through Better Auth itself, since Anchor signs nobody in.
 */
export const createSessionHandler = (auth: AuthServer) => {
  const adapter = betterAuth({ sdk: auth });

  const handlePage = async (request: Request) => {
    const { state, headers } = await getRequestSession(request, { adapter });
    const page = new Headers(headers);

    page.set("content-type", "text/html; charset=utf-8");

    return new Response(
      renderSessionPage(
        state,
        getSessionHydration(state, {
          select: ({ user }) => ({ name: user.name }),
        }),
      ),
      { status: state.status === "unavailable" ? 503 : 200, headers: page },
    );
  };

  const handleSignUp = async (request: Request) => {
    const form = await request.formData();

    const { headers } = await auth.api.signUpEmail({
      body: {
        name: getVisitorName(form.get("name")),
        email: `visitor-${crypto.randomUUID()}@example.com`,
        password: crypto.randomUUID(),
      },
      returnHeaders: true,
    });

    return getRedirectHome(headers);
  };

  const handleSignOut = async (request: Request) => {
    const { headers } = await auth.api.signOut({
      headers: request.headers,
      returnHeaders: true,
    });

    return getRedirectHome(headers);
  };

  const routes: Record<string, (request: Request) => Promise<Response>> = {
    "GET /": handlePage,
    "POST /sign-up": handleSignUp,
    "POST /sign-out": handleSignOut,
  };

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const handleRoute = routes[`${request.method} ${url.pathname}`];

    if (handleRoute === undefined) {
      return new Response("Not found.", { status: 404 });
    }

    // A browser names the page a form was posted from, so a post from another site is refused.
    if (request.method === "POST" && origin !== null && origin !== url.origin) {
      return new Response("Cross-site request refused.", { status: 403 });
    }

    try {
      return await handleRoute(request);
    } catch {
      return new Response("The request could not be handled.", {
        status: 400,
      });
    }
  };
};
