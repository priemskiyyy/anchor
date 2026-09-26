import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { FirebaseAdapterOptions } from "src/types/FirebaseAdapterOptions";
import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseIdToken } from "src/types/FirebaseIdToken";
import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";
import { FIREBASE_ADAPTER_NAME } from "src/utils/constants/firebase";
import { signOutSession } from "src/utils/signOutSession";
import { getTokenIssuer } from "src/utils/getTokenIssuer";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getFirebaseSessionUser } from "src/utils/getFirebaseSessionUser";
import { getSessionIdToken } from "src/utils/getSessionIdToken";

/**
 * Firebase Auth sessions for Anchor over the modular `Auth` instance your
 * application initialized: `onIdTokenChanged` reports every change, and each
 * token profile mints the user's ID token.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: firebase({ sdk: getAuth(app), tokens: { api: idToken() } }),
 * });
 * ```
 */
export function firebase<
  TAuth extends FirebaseAuthLike,
  TTokens extends Record<string, FirebaseIdToken> = Record<
    never,
    FirebaseIdToken
  >,
>(
  options: FirebaseAdapterOptions<TAuth, FirebaseSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<FirebaseSessionUser, TAuth, Extract<keyof TTokens, string>>;

export function firebase<
  TAuth extends FirebaseAuthLike,
  TUser,
  TTokens extends Record<string, FirebaseIdToken> = Record<
    never,
    FirebaseIdToken
  >,
>(
  options: FirebaseAdapterOptions<TAuth, TUser, TTokens> & {
    user: (user: NonNullable<TAuth["currentUser"]>) => TUser;
  },
): SessionAdapter<TUser, TAuth, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function firebase({
  sdk,
  user = getFirebaseSessionUser,
  tokens = {},
}: FirebaseAdapterOptions<
  FirebaseAuthLike,
  unknown,
  Record<string, FirebaseIdToken>
>): SessionAdapter<unknown, FirebaseAuthLike, string> {
  return {
    name: FIREBASE_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const authority = getTokenIssuer(sdk);

      const unsubscribe = sdk.onIdTokenChanged((current) =>
        observer.session(getSessionAnswer(current, authority, user)),
      );

      return {
        read: async () => {
          await sdk.authStateReady();

          return getSessionAnswer(sdk.currentUser, authority, user);
        },
        getToken: (request) => getSessionIdToken(sdk, request),
        end: (request) => signOutSession(sdk, request),
        dispose: unsubscribe,
      };
    },
  };
}
