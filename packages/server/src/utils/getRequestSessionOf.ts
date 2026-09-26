import type { AnchorSession } from "@priemskiyyy/anchor";

import type { RequestSession } from "src/types/RequestSession";

export const getRequestSessionOf = <TUser, TProfile extends string>({
  principal,
  user,
  guest,
  impersonated,
}: AnchorSession<TUser, TProfile>): RequestSession<TUser> =>
  Object.freeze({ principal, user, guest, impersonated });
