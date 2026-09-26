import type { Anchor, AnchorSession, SessionState } from "@priemskiyyy/anchor";

/**
 * Declaration-merging target that types every export of this package with the
 * application's Anchor. Augment it once, next to the Anchor:
 *
 * @example
 * ```ts
 * declare module "@priemskiyyy/anchor-vue" {
 *   interface Register {
 *     anchor: typeof anchor;
 *   }
 * }
 * ```
 */
export interface Register {}

type Registration = Register extends {
  anchor: Anchor<infer TUser, infer TNative, infer TProfile extends string>;
}
  ? { user: TUser; native: TNative; profile: TProfile }
  : { user: unknown; native: unknown; profile: string };

/**
 * The registered Anchor's user, or `unknown` when nothing is registered.
 *
 * @example
 * ```ts
 * const user: RegisteredUser = session.user;
 * ```
 */
export type RegisteredUser = Registration["user"];

/**
 * The token profiles the registered Anchor's adapter declares, or any string
 * when nothing is registered.
 *
 * @example
 * ```ts
 * const profile: RegisteredTokenProfile = "api";
 * ```
 */
export type RegisteredTokenProfile = Registration["profile"];

/**
 * The registered Anchor. Unregistered, it is the untyped Anchor, which an Anchor
 * typed by its own adapter cannot be assigned to.
 *
 * @example
 * ```ts
 * const anchor: RegisteredAnchor = useAnchor();
 * ```
 */
export type RegisteredAnchor = Anchor<
  RegisteredUser,
  Registration["native"],
  RegisteredTokenProfile
>;

/**
 * The registered Anchor's session state, as `useSession()` holds it.
 *
 * @example
 * ```ts
 * const state: RegisteredSessionState = useSession().value;
 * ```
 */
export type RegisteredSessionState = SessionState<
  RegisteredUser,
  RegisteredTokenProfile
>;

/**
 * The registered Anchor's session, for the props of a component that works
 * inside one.
 *
 * @example
 * ```ts
 * const props = defineProps<{ session: RegisteredSession }>();
 * ```
 */
export type RegisteredSession = AnchorSession<
  RegisteredUser,
  RegisteredTokenProfile
>;
