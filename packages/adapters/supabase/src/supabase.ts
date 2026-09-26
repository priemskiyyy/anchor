import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { SupabaseAccessToken } from "src/types/SupabaseAccessToken";
import type { SupabaseAdapterOptions } from "src/types/SupabaseAdapterOptions";
import type { SupabaseClientLike } from "src/types/SupabaseClientLike";
import type { SupabaseUserOf } from "src/types/SupabaseUserOf";
import {
  INITIAL_SESSION_EVENT,
  SUPABASE_ADAPTER_NAME,
} from "src/utils/constants/supabase";
import { signOutSession } from "src/utils/signOutSession";
import { getSessionAccessToken } from "src/utils/getSessionAccessToken";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getCurrentSession } from "src/utils/getCurrentSession";

const keepSupabaseUser = <TUser>(user: TUser) => user;

/**
 * Supabase Auth sessions for Anchor over the supabase-js client your
 * application created: `onAuthStateChange` reports every change, each token
 * profile mints the session's access token, and ending uses the local scope.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: supabase({ sdk: supabaseClient, tokens: { api: accessToken() } }),
 * });
 * ```
 */
export function supabase<
  TClient extends SupabaseClientLike,
  TTokens extends Record<string, SupabaseAccessToken> = Record<
    never,
    SupabaseAccessToken
  >,
>(
  options: SupabaseAdapterOptions<TClient, SupabaseUserOf<TClient>, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<
  SupabaseUserOf<TClient>,
  TClient,
  Extract<keyof TTokens, string>
>;

export function supabase<
  TClient extends SupabaseClientLike,
  TUser,
  TTokens extends Record<string, SupabaseAccessToken> = Record<
    never,
    SupabaseAccessToken
  >,
>(
  options: SupabaseAdapterOptions<TClient, TUser, TTokens> & {
    user: (user: SupabaseUserOf<TClient>) => TUser;
  },
): SessionAdapter<TUser, TClient, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function supabase({
  sdk,
  user = keepSupabaseUser,
  tokens = {},
}: SupabaseAdapterOptions<
  SupabaseClientLike,
  unknown,
  Record<string, SupabaseAccessToken>
>): SessionAdapter<unknown, SupabaseClientLike, string> {
  return {
    name: SUPABASE_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      // A synchronous callback: supabase-js documents deadlocks for asynchronous ones.
      const { data } = sdk.auth.onAuthStateChange((event, session) => {
        if (event === INITIAL_SESSION_EVENT) {
          return;
        }

        observer.session(getSessionAnswer(session, user));
      });

      return {
        read: async () => getSessionAnswer(await getCurrentSession(sdk), user),
        getToken: (request) => getSessionAccessToken(sdk, request),
        end: (request) => signOutSession(sdk, request),
        dispose: () => data.subscription.unsubscribe(),
      };
    },
  };
}
