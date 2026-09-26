import type { OidcProfileLike } from "src/types/OidcProfileLike";

export const getSessionContext = ({
  org_id,
  organization,
  sid,
  act,
}: OidcProfileLike) => {
  const claims = [
    org_id ?? null,
    organization ?? null,
    sid ?? null,
    act ?? null,
  ];

  if (claims.every((claim) => claim === null)) {
    return null;
  }

  return JSON.stringify(claims);
};
