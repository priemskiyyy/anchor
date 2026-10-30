import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { BetterAuthAdapterOptions } from "src/types/BetterAuthAdapterOptions";
import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthSessionToken } from "src/types/BetterAuthSessionToken";
import type { BetterAuthSessionUser } from "src/types/BetterAuthSessionUser";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";
import { BETTER_AUTH_ADAPTER_NAME } from "src/utils/constants/betterAuth";
import { getBetterAuthSessionUser } from "src/utils/getBetterAuthSessionUser";
import { getRefreshedSession } from "src/utils/getRefreshedSession";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSessionAtom } from "src/utils/getSessionAtom";
import { getSessionToken } from "src/utils/getSessionToken";
import { signOutSession } from "src/utils/signOutSession";
import { subscribeToSessionAnswers } from "src/utils/subscribeToSessionAnswers";

/**
 * Better Auth sessions for Anchor over the Better Auth client your application
 * created, in the browser or on React Native with the Expo plugin: the session
 * atom behind `useSession` reports every settled change and serves every read,
 * a `sessionToken()` profile mints the session's token for your API, and
 * ending signs this session out on the server.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: betterAuth({ sdk: authClient, tokens: { api: sessionToken() } }),
 * });
 * ```
 */
export function betterAuth<
  TClient extends BetterAuthClientLike,
  TTokens extends Record<string, BetterAuthSessionToken> = Record<
    never,
    BetterAuthSessionToken
  >,
>(
  options: BetterAuthAdapterOptions<TClient, BetterAuthSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<
  BetterAuthSessionUser,
  TClient,
  Extract<keyof TTokens, string>
>;

export function betterAuth<
  TClient extends BetterAuthClientLike,
  TUser,
  TTokens extends Record<string, BetterAuthSessionToken> = Record<
    never,
    BetterAuthSessionToken
  >,
>(
  options: BetterAuthAdapterOptions<TClient, TUser, TTokens> & {
    user: (user: BetterAuthUserOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function betterAuth({
  sdk,
  user = getBetterAuthSessionUser,
  confirmation,
  tokens = {},
}: BetterAuthAdapterOptions<
  BetterAuthClientLike,
  unknown,
  Record<string, BetterAuthSessionToken>
>): SessionAdapter<unknown, BetterAuthClientLike, string> {
  return {
    name: BETTER_AUTH_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const atom = getSessionAtom(sdk);

      const unsubscribe = subscribeToSessionAnswers(
        atom,
        confirmation?.timeout ?? null,
        (data) => observer.session(getSessionAnswer(data, user)),
      );

      return {
        read: async ({ signal }) =>
          getSessionAnswer(await getRefreshedSession(atom, signal), user),
        getToken: (request) => getSessionToken(atom, request),
        end: (request) => signOutSession(sdk, atom, request),
        dispose: unsubscribe,
      };
    },
  };
}
