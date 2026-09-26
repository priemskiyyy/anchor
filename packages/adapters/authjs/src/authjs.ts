import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { AuthjsAdapterOptions } from "src/types/AuthjsAdapterOptions";
import type { AuthjsClientLike } from "src/types/AuthjsClientLike";
import type { AuthjsSessionOf } from "src/types/AuthjsSessionOf";
import type { AuthjsSessionUser } from "src/types/AuthjsSessionUser";
import {
  AUTHJS_ADAPTER_NAME,
  DEFAULT_BASE_PATH,
} from "src/utils/constants/authjs";
import { getAuthjsSessionUser } from "src/utils/getAuthjsSessionUser";
import { getCurrentSession } from "src/utils/getCurrentSession";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { listenToSessionBroadcasts } from "src/utils/listenToSessionBroadcasts";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Auth.js sessions for Anchor over the `next-auth/react` client module: the
 * cookie session the server answers `getSession()` with, heard again whenever
 * another tab broadcasts a change, and ended with a sign-out that never
 * redirects. The session needs the user id your `session` callback adds.
 *
 * @example
 * ```ts
 * import * as nextAuth from "next-auth/react";
 *
 * const anchor = new Anchor({ adapter: authjs({ sdk: nextAuth }) });
 * ```
 */
export function authjs<TClient extends AuthjsClientLike>(
  options: AuthjsAdapterOptions<TClient, AuthjsSessionUser> & {
    user?: undefined;
  },
): SessionAdapter<AuthjsSessionUser, TClient, never>;

export function authjs<TClient extends AuthjsClientLike, TUser>(
  options: AuthjsAdapterOptions<TClient, TUser> & {
    user: (session: AuthjsSessionOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, never>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function authjs({
  sdk,
  basePath = DEFAULT_BASE_PATH,
  user = getAuthjsSessionUser,
}: AuthjsAdapterOptions<AuthjsClientLike, unknown>): SessionAdapter<
  unknown,
  AuthjsClientLike,
  never
> {
  return {
    name: AUTHJS_ADAPTER_NAME,
    native: sdk,
    tokens: {},
    open: (observer) => {
      const stopListening = listenToSessionBroadcasts(() =>
        observer.invalidate(),
      );

      return {
        read: async () =>
          getSessionAnswer(await getCurrentSession(basePath), user),
        end: (request) => signOutSession(sdk, basePath, request),
        dispose: stopListening,
      };
    },
  };
}
