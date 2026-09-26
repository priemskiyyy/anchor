import type { SessionIdentity } from "@priemskiyyy/anchor";

import type { AmplifyJwtLike } from "src/types/AmplifyJwtLike";
import { getSessionContext } from "src/utils/getSessionContext";

export const isSessionUser = (
  payload: AmplifyJwtLike["payload"],
  { principal, context }: SessionIdentity,
) =>
  payload.iss === principal.authority &&
  payload.sub === principal.subject &&
  getSessionContext(payload) === context;
