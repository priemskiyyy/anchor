import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { OidcProfileLike } from "src/types/OidcProfileLike";
import type { OidcUserLike } from "src/types/OidcUserLike";
import { SIGNED_OUT_ANSWER } from "src/utils/constants/answers";
import { getSessionContext } from "src/utils/getSessionContext";

export const getSessionAnswer = <TUser>(
  user: OidcUserLike | null,
  mapUser: (profile: OidcProfileLike) => TUser,
): SessionAnswer<TUser> => {
  if (user === null) {
    return SIGNED_OUT_ANSWER;
  }

  const { profile } = user;

  return {
    status: "signed-in",
    // A profile without iss or sub answers them empty, which the core refuses as INVALID_ANSWER.
    principal: {
      authority: profile.iss ?? "",
      subject: profile.sub ?? "",
      tenant: null,
    },
    user: mapUser(profile),
    context: getSessionContext(profile),
    guest: false,
    impersonated: profile.act !== undefined,
  };
};
