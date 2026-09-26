import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";

import { AUTH_SECRET, SERVER_ORIGIN } from "src/utils/constants/server";

/** The server's own Better Auth on a memory database: the application creates and owns it, and Anchor only reads through it. */
export const createAuthServer = () =>
  betterAuth({
    baseURL: SERVER_ORIGIN,
    secret: AUTH_SECRET,
    database: memoryAdapter({
      user: [],
      session: [],
      account: [],
      verification: [],
    }),
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
  });
