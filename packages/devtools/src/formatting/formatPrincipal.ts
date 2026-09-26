import type { Principal } from "@priemskiyyy/anchor";

export const formatPrincipal = ({ authority, subject, tenant }: Principal) => {
  if (tenant === null) {
    return `${authority} · ${subject}`;
  }

  return `${authority} · ${subject} · tenant ${tenant}`;
};
