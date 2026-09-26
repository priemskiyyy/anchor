import type { AmplifySessionUser } from "src/types/AmplifySessionUser";
import type { AmplifyUserLike } from "src/types/AmplifyUserLike";

export const getAmplifySessionUser = ({
  username,
  userId,
  signInDetails,
}: AmplifyUserLike): AmplifySessionUser => ({
  username,
  userId,
  signInDetails:
    signInDetails === undefined
      ? null
      : {
          loginId: signInDetails.loginId ?? null,
          authFlowType: signInDetails.authFlowType ?? null,
        },
});
