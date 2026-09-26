import type { OktaClaimsLike } from "src/types/OktaClaimsLike";

export const getSessionContext = ({ sid }: OktaClaimsLike) => sid ?? null;
