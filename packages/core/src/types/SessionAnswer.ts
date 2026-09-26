import type { Principal } from "src/types/Principal";
import type { SessionAction } from "src/types/SessionAction";

/**
 * What an adapter reports the provider's session to be. `signed-out` needs the
 * provider's positive word; a provider that cannot tell makes `read` throw.
 *
 * @example
 * ```ts
 * const answer: SessionAnswer<{ name: string }> = {
 *   status: "signed-in",
 *   principal: { authority: "https://example.auth0.com/", subject: "auth0|42", tenant: null },
 *   user: { name: "Ada" },
 *   context: null,
 *   guest: false,
 *   impersonated: false,
 * };
 * ```
 */
export type SessionAnswer<TUser> =
  | { status: "signed-out" }
  | {
      status: "signed-in";
      principal: Principal;
      user: TUser;
      /** A deterministic fingerprint of what else changes permissions: organization, provider session, impersonator. */
      context: string | null;
      guest: boolean;
      impersonated: boolean;
    }
  | {
      status: "action-required";
      action: SessionAction;
      principal: Principal;
      user: TUser;
      /** A deterministic fingerprint of what else changes permissions: organization, provider session, impersonator. */
      context: string | null;
      guest: boolean;
      impersonated: boolean;
    };
