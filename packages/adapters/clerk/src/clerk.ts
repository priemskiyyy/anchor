import type { SessionAdapter } from "@priemskiyyy/anchor";

import type { ClerkAdapterOptions } from "src/types/ClerkAdapterOptions";
import type { ClerkLike } from "src/types/ClerkLike";
import type { ClerkSessionToken } from "src/types/ClerkSessionToken";
import type { ClerkSessionUser } from "src/types/ClerkSessionUser";
import type { ClerkUserOf } from "src/types/ClerkUserOf";
import { CLERK_ADAPTER_NAME } from "src/utils/constants/clerk";
import { getClerkSessionUser } from "src/utils/getClerkSessionUser";
import { getLoadedSession } from "src/utils/getLoadedSession";
import { getSessionAnswer } from "src/utils/getSessionAnswer";
import { getSessionToken } from "src/utils/getSessionToken";
import { pushSessionAnswer } from "src/utils/pushSessionAnswer";
import { signOutSession } from "src/utils/signOutSession";

/**
 * Clerk sessions for Anchor over the Clerk instance your application loaded,
 * in the browser or on React Native through Clerk Expo: its listener reports
 * every session, organization and pending task, each token profile mints the
 * session's token or a JWT template, and ending signs out exactly this
 * session. The first read waits for `load()`.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({
 *   adapter: clerk({ sdk: clerkInstance, tokens: { api: sessionToken() } }),
 * });
 * ```
 */
export function clerk<
  TClerk extends ClerkLike,
  TTokens extends Record<string, ClerkSessionToken> = Record<
    never,
    ClerkSessionToken
  >,
>(
  options: ClerkAdapterOptions<TClerk, ClerkSessionUser, TTokens> & {
    user?: undefined;
  },
): SessionAdapter<ClerkSessionUser, TClerk, Extract<keyof TTokens, string>>;

export function clerk<
  TClerk extends ClerkLike,
  TUser,
  TTokens extends Record<string, ClerkSessionToken> = Record<
    never,
    ClerkSessionToken
  >,
>(
  options: ClerkAdapterOptions<TClerk, TUser, TTokens> & {
    user: (user: ClerkUserOf<TClerk>) => TUser;
  },
): SessionAdapter<TUser, TClerk, Extract<keyof TTokens, string>>;

// An overload pair resolves the user type from whether a mapper is given, as Silo's value does.
export function clerk({
  sdk,
  user = getClerkSessionUser,
  tokens = {},
}: ClerkAdapterOptions<
  ClerkLike,
  unknown,
  Record<string, ClerkSessionToken>
>): SessionAdapter<unknown, ClerkLike, string> {
  return {
    name: CLERK_ADAPTER_NAME,
    native: sdk,
    tokens,
    open: (observer) => {
      const removeListener = sdk.addListener(({ session }) => {
        // Clerk emits an undefined session while it loads, switches or signs out, which says nothing yet.
        if (session === undefined) {
          return;
        }

        pushSessionAnswer(observer, () =>
          getSessionAnswer(sdk.frontendApi, session, user),
        );
      });

      return {
        read: async ({ signal }) =>
          getSessionAnswer(
            sdk.frontendApi,
            await getLoadedSession(sdk, signal),
            user,
          ),
        getToken: (request) => getSessionToken(sdk, tokens, request),
        end: (request) => signOutSession(sdk, request),
        dispose: removeListener,
      };
    },
  };
}
