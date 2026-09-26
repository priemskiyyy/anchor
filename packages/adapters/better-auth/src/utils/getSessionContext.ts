import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";

export const getSessionContext = ({ session }: BetterAuthSessionLike) =>
  JSON.stringify([
    session.activeOrganizationId ?? null,
    session.activeTeamId ?? null,
    session.id,
  ]);
