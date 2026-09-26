import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { AmplifyAccessToken } from "src/types/AmplifyAccessToken";
import type { AmplifyAdapterOptions } from "src/types/AmplifyAdapterOptions";
import type { AmplifyIdToken } from "src/types/AmplifyIdToken";
import type { AmplifyLike } from "src/types/AmplifyLike";
import type { AmplifySessionUser } from "src/types/AmplifySessionUser";
import type { AmplifyUserOf } from "src/types/AmplifyUserOf";
import {
  AMPLIFY_ADAPTER_NAME,
  AUTH_CHANNEL,
} from "src/utils/constants/amplify";
import { getAmplifySessionUser } from "src/utils/getAmplifySessionUser";
import { getCurrentSession } from "src/utils/getCurrentSession";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSessionToken } from "src/utils/getSessionToken";
import { handleAuthEvent } from "src/utils/handleAuthEvent";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Amazon Cognito sessions for Anchor over the Amplify v6 Auth functions and
 * Hub of your configured application: the Hub reports every sign-in, refresh
 * and sign-out, each token profile mints the session's access or ID token
 * through `fetchAuthSession()`, and ending signs this device out only.
 *
 * @example
 * ```ts
 * import * as auth from "aws-amplify/auth";
 * import { Hub } from "aws-amplify/utils";
 *
 * const anchor = new Anchor({
 *   adapter: amplify({ sdk: { auth, hub: Hub }, tokens: { api: accessToken() } }),
 * });
 * ```
 */
export function amplify<
  TSdk extends AmplifyLike,
  TTokens extends Record<string, AmplifyAccessToken | AmplifyIdToken> = Record<
    never,
    AmplifyAccessToken | AmplifyIdToken
  >,
>(
  options: AmplifyAdapterOptions<TSdk, AmplifySessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<AmplifySessionUser, TSdk, Extract<keyof TTokens, string>>;

export function amplify<
  TSdk extends AmplifyLike,
  TUser,
  TTokens extends Record<string, AmplifyAccessToken | AmplifyIdToken> = Record<
    never,
    AmplifyAccessToken | AmplifyIdToken
  >,
>(
  options: AmplifyAdapterOptions<TSdk, TUser, TTokens> & {
    user: (user: AmplifyUserOf<TSdk>) => TUser;
  },
): SessionAdapter<TUser, TSdk, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function amplify({
  sdk,
  user = getAmplifySessionUser,
  tokens = {},
}: AmplifyAdapterOptions<
  AmplifyLike,
  unknown,
  Record<string, AmplifyAccessToken | AmplifyIdToken>
>): SessionAdapter<unknown, AmplifyLike, string> {
  return {
    name: AMPLIFY_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const stopListening = sdk.hub.listen(AUTH_CHANNEL, (capsule) =>
        handleAuthEvent(observer, capsule),
      );

      return {
        read: async () => getSessionAnswer(await getCurrentSession(sdk), user),
        getToken: (request) => getSessionToken(sdk, tokens, request),
        end: (request) => signOutSession(sdk, request),
        dispose: stopListening,
      };
    },
  };
}
