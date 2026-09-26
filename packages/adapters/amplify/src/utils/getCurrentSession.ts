import type { AmplifyLike } from "src/types/AmplifyLike";
import { USER_UNAUTHENTICATED_EXCEPTION } from "src/utils/constants/amplify";

const getSignedInUser = async (sdk: AmplifyLike) => {
  try {
    return await sdk.auth.getCurrentUser();
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === USER_UNAUTHENTICATED_EXCEPTION
    ) {
      return null;
    }

    throw error;
  }
};

export const getCurrentSession = async (sdk: AmplifyLike) => {
  const user = await getSignedInUser(sdk);

  if (user === null) {
    return null;
  }

  const { tokens } = await sdk.auth.fetchAuthSession({ forceRefresh: false });
  const idToken = tokens?.idToken;

  if (idToken === undefined) {
    throw new TypeError(
      "Amplify holds a signed-in user but no ID token to name it: request the openid scope.",
    );
  }

  if (idToken.payload.sub !== user.userId) {
    throw new Error("Amplify switched users while the session was read.");
  }

  return { user, idToken };
};
