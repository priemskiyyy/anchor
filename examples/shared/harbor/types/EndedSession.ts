import type { EndResult } from "@priemskiyyy/anchor";

/** The last sign-out: what `session.end()` proved, and whether its logout page was opened. */
export type EndedSession = {
  result: EndResult;
  provider: { label: string };
  /** The provider's server session the logout page ends, as this browser held it before signing out. */
  server: { id: string } | null;
  opened: boolean;
};
