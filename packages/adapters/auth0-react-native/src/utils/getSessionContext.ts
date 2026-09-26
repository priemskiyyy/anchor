import type { Auth0UserLike } from "src/types/Auth0UserLike";

export const getSessionContext = ({ org_id }: Auth0UserLike) => org_id ?? null;
