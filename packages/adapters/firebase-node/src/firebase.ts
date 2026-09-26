import type { ServerSessionAdapter } from "@priemskiyyy/anchor-server";

import type { FirebaseAdapterOptions } from "src/types/FirebaseAdapterOptions";
import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseDecodedTokenOf } from "src/types/FirebaseDecodedTokenOf";
import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";
import {
  DEFAULT_SESSION_COOKIE,
  FIREBASE_ADAPTER_NAME,
} from "src/utils/constants/firebase";
import { getFirebaseSessionUser } from "src/utils/getFirebaseSessionUser";
import { getServerSessionAnswer } from "src/utils/getServerSessionAnswer";

/**
 * Request-scoped Firebase Auth sessions for `getRequestSession()` from
 * `@priemskiyyy/anchor-server`, over the server's firebase-admin `Auth`: each
 * read verifies the request's bearer ID token, or else its session cookie,
 * and maps it as the client adapter maps the same user.
 *
 * @example
 * ```ts
 * const { state } = await getRequestSession(request, { adapter: firebase({ sdk: getAuth(app), checkRevoked: true }) });
 * ```
 */
export function firebase<TAuth extends FirebaseAuthLike>(
  options: FirebaseAdapterOptions<TAuth, FirebaseSessionUser> & {
    user?: undefined;
  },
): ServerSessionAdapter<FirebaseSessionUser, TAuth>;

export function firebase<TAuth extends FirebaseAuthLike, TUser>(
  options: FirebaseAdapterOptions<TAuth, TUser> & {
    user: (token: FirebaseDecodedTokenOf<TAuth>) => TUser;
  },
): ServerSessionAdapter<TUser, TAuth>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function firebase({
  sdk,
  cookie = DEFAULT_SESSION_COOKIE,
  checkRevoked = false,
  user = getFirebaseSessionUser,
}: FirebaseAdapterOptions<FirebaseAuthLike, unknown>): ServerSessionAdapter<
  unknown,
  FirebaseAuthLike
> {
  return {
    name: FIREBASE_ADAPTER_NAME,
    native: sdk,
    read: ({ headers }) =>
      getServerSessionAnswer(sdk, headers, { cookie, checkRevoked }, user),
  };
}
