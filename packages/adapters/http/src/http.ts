import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { HttpAdapterOptions } from "src/types/HttpAdapterOptions";
import type { HttpTokenMinter } from "src/types/HttpTokenMinter";
import { HTTP_ADAPTER_NAME } from "src/utils/constants/http";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { mintSessionToken } from "src/utils/mintSessionToken";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Your own backend as the session provider, through your own client: `read`
 * answers the current session, each token profile mints through its own
 * function, and `end` ends exactly the session named. It observes nothing, so
 * call `anchor.sync()` after a sign-in or sign-out flow.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: http({
 *     authority: "https://api.example.com",
 *     read: async ({ signal }) => {
 *       const response = await fetch("/api/session", { credentials: "include", signal });
 *
 *       if (response.status === 401) {
 *         return null;
 *       }
 *
 *       if (!response.ok) {
 *         throw new Error(`The session endpoint answered ${response.status}.`);
 *       }
 *
 *       const { user, session } = SessionSchema.parse(await response.json());
 *
 *       return { subject: user.id, user, context: session.id };
 *     },
 *   }),
 * });
 * ```
 */
export const http = <
  TUser,
  // Inferred from the keys alone, so each minter, an unannotated function, still gets `HttpTokenMinter` as its contextual type.
  TProfile extends string = never,
>({
  authority,
  read,
  end,
  tokens,
}: HttpAdapterOptions<TUser, TProfile>): SessionAdapter<
  TUser,
  null,
  TProfile
> => {
  const profiles: Partial<Record<string, HttpTokenMinter>> = tokens ?? {};

  return {
    name: HTTP_ADAPTER_NAME,
    native: null,
    tokens: profiles,
    open: () => ({
      read: async (context) => getSessionAnswer(await read(context), authority),
      getToken: (request) => mintSessionToken(profiles, request),
      ...(end === undefined
        ? {}
        : { end: (request) => signOutSession(end, request) }),
    }),
  };
};
