import type { KeycloakTokenParsedLike } from "src/types/KeycloakTokenParsedLike";

export const getSessionContext = ({
  organization,
  sid,
}: KeycloakTokenParsedLike) => {
  const claims = [organization ?? null, sid ?? null];

  if (claims.every((claim) => claim === null)) {
    return null;
  }

  return JSON.stringify(claims);
};
