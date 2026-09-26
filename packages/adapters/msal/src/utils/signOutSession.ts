import type { EndRequest, EndResult } from "@priemskiyyy/anchor";

import type { MsalLike } from "src/types/MsalLike";
import {
  LOCAL_END_RESULT,
  NOT_APPLICABLE_END_RESULT,
} from "src/utils/constants/answers";
import { isSessionAccount } from "src/utils/isSessionAccount";

export const signOutSession = async (
  sdk: MsalLike,
  { session }: EndRequest,
): Promise<EndResult> => {
  const account = sdk.getActiveAccount();

  if (!isSessionAccount(account, session)) {
    return NOT_APPLICABLE_END_RESULT;
  }

  await sdk.clearCache({ account });

  return LOCAL_END_RESULT;
};
