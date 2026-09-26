import type { Auth0ClaimsLike } from "src/types/Auth0ClaimsLike";

export const getSessionContext = ({ sid, org_id }: Auth0ClaimsLike) => {
  if (sid === undefined && org_id === undefined) {
    return null;
  }

  return JSON.stringify([org_id ?? null, sid ?? null]);
};
