import type { AmplifyJwtLike } from "src/types/AmplifyJwtLike";
import type { AmplifyUserLike } from "src/types/AmplifyUserLike";

/**
 * The parts of Amplify v6 the adapter calls: the Auth functions of
 * `aws-amplify/auth`, as the namespace or just those three, and the `Hub` of
 * `aws-amplify/utils`. Amplify v6 is a set of functions over one configured
 * singleton, so the adapter takes the functions; it never calls
 * `Amplify.configure()` and never signs anyone in.
 *
 * @example
 * ```ts
 * import * as auth from "aws-amplify/auth";
 * import { Hub } from "aws-amplify/utils";
 *
 * const sdk: AmplifyLike = { auth, hub: Hub };
 * ```
 */
export type AmplifyLike = {
  auth: {
    getCurrentUser: () => Promise<AmplifyUserLike>;
    fetchAuthSession: (options: { forceRefresh: boolean }) => Promise<{
      tokens?:
        | {
            accessToken: AmplifyJwtLike;
            idToken?: AmplifyJwtLike | undefined;
          }
        | undefined;
    }>;
    signOut: (input: { global: false }) => Promise<void>;
  };
  hub: {
    /** Listens on the `auth` channel; answers the function that stops the listener. */
    listen: (
      channel: "auth",
      callback: (capsule: { payload: { event: string } }) => void,
    ) => () => void;
  };
};
