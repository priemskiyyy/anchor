import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { Auth0ClientLike } from "src/types/Auth0ClientLike";
import { NOT_APPLICABLE_END_RESULT } from "src/utils/constants/answers";
import { isSessionUser } from "src/utils/isSessionUser";

export const signOutSession = async (
  sdk: Auth0ClientLike,
  returnTo: string | undefined,
  { session }: EndRequest,
): Promise<EndResult> => {
  if (!isSessionUser(await sdk.getIdTokenClaims(), session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  const captured: { url: string | null } = { url: null };

  await sdk.logout({
    openUrl: (url) => {
      captured.url = url;
    },
    ...(returnTo === undefined ? {} : { logoutParams: { returnTo } }),
  });

  return {
    local: "completed",
    remote: "unknown",
    navigation: captured.url === null ? null : { url: captured.url },
  };
};
