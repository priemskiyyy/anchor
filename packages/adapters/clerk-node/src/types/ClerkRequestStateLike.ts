import type { ClerkAuthLike } from "src/types/ClerkAuthLike";

/**
 * The parts of the request state `authenticateRequest()` answers that the
 * adapter reads: signed in with its auth, signed out with Clerk's reason, or
 * a handshake Clerk needs the browser to make, each with the headers Clerk
 * wants set on the response.
 *
 * @example
 * ```ts
 * const state: ClerkRequestStateLike = await clerkClient.authenticateRequest(request);
 * ```
 */
export type ClerkRequestStateLike =
  | {
      status: "signed-in";
      headers: Headers;
      toAuth: (options: { treatPendingAsSignedOut: false }) => ClerkAuthLike;
    }
  | {
      status: "signed-out";
      headers: Headers;
      /** Why Clerk found no session, such as `session-token-and-uat-missing`, or why it could not tell, such as `jwk-remote-failed-to-load`. */
      reason: string;
      message: string;
    }
  | { status: "handshake"; headers: Headers; reason: string; message: string };
