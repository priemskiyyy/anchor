import type { ClerkSessionLike } from "src/types/ClerkSessionLike";

export const getSessionContext = ({
  id,
  lastActiveOrganizationId,
  actor,
}: ClerkSessionLike) =>
  JSON.stringify([lastActiveOrganizationId, id, actor?.sub ?? null]);
