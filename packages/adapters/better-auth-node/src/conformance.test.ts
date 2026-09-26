import { testServerSessionAdapter } from "@priemskiyyy/anchor-server/testing";
import { betterAuth as createAuthServer } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

import { betterAuth } from "src/betterAuth";

// The cookie header a browser would send back after the response that set these cookies.
const getCookieHeader = (headers: Headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

testServerSessionAdapter({
  name: "better-auth-node",
  createFixture: () => {
    const auth = createAuthServer({
      baseURL: "http://localhost:3000",
      secret: "anchor-better-auth-node-conformance-secret-0123456789",
      database: memoryAdapter({ user: [], session: [], account: [] }),
      emailAndPassword: { enabled: true },
      logger: { disabled: true },
    });

    return {
      adapter: betterAuth({ sdk: auth }),
      native: auth,
      signIn: async (name) => {
        const { headers, response } = await auth.api.signUpEmail({
          body: {
            email: `${name}@example.com`,
            password: "correct-horse-battery-staple",
            name,
          },
          returnHeaders: true,
        });

        return {
          headers: new Headers({ cookie: getCookieHeader(headers) }),
          subject: response.user.id,
        };
      },
      signOut: async (headers) => {
        await auth.api.signOut({ headers });
      },
    };
  },
});
