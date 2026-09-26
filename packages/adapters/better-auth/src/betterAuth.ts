import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { BetterAuthAdapterOptions } from "src/types/BetterAuthAdapterOptions";
import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";
import type { BetterAuthSessionUser } from "src/types/BetterAuthSessionUser";
import type { BetterAuthUserOf } from "src/types/BetterAuthUserOf";
import { BETTER_AUTH_ADAPTER_NAME } from "src/utils/constants/betterAuth";
import { getBetterAuthSessionUser } from "src/utils/getBetterAuthSessionUser";
import { getRefreshedSession } from "src/utils/getRefreshedSession";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSessionAtom } from "src/utils/getSessionAtom";
import { isAnsweredSessionState } from "src/utils/isAnsweredSessionState";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Better Auth sessions for Anchor over the Better Auth client your application
 * created, in the browser or on React Native with the Expo plugin: the session
 * atom behind `useSession` reports every settled change and serves every read,
 * the cookie session needs no token profile, and ending signs this session
 * out on the server.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({ adapter: betterAuth({ sdk: authClient }) });
 * ```
 */
export function betterAuth<TClient extends BetterAuthClientLike>(
  options: BetterAuthAdapterOptions<TClient, BetterAuthSessionUser> & {
    user?: undefined;
  },
): SessionAdapter<BetterAuthSessionUser, TClient, never>;

export function betterAuth<TClient extends BetterAuthClientLike, TUser>(
  options: BetterAuthAdapterOptions<TClient, TUser> & {
    user: (user: BetterAuthUserOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, never>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function betterAuth({
  sdk,
  user = getBetterAuthSessionUser,
}: BetterAuthAdapterOptions<BetterAuthClientLike, unknown>): SessionAdapter<
  unknown,
  BetterAuthClientLike,
  never
> {
  return {
    name: BETTER_AUTH_ADAPTER_NAME,
    native: sdk,
    tokens: {},
    open: (observer) => {
      const atom = getSessionAtom(sdk);

      const unsubscribe = atom.subscribe((value) => {
        if (!isAnsweredSessionState(value)) {
          return;
        }

        observer.session(getSessionAnswer(value.data, user));
      });

      return {
        read: async ({ signal }) =>
          getSessionAnswer(await getRefreshedSession(atom, signal), user),
        end: (request) => signOutSession(sdk, atom, request),
        dispose: unsubscribe,
      };
    },
  };
}
