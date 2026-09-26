import type { WorkosClientLike } from "src/types/WorkosClientLike";
import { isLoginRequiredError } from "src/utils/isLoginRequiredError";

export const getCurrentUser = async (sdk: WorkosClientLike) => {
  const user = sdk.getUser();

  if (user !== null) {
    return user;
  }

  // AuthKit holds no user after a first refresh that failed on the network too, and only a refresh WorkOS refused proves there is no session.
  try {
    await sdk.getAccessToken({ forceRefresh: false });
  } catch (error) {
    if (!isLoginRequiredError(error)) {
      throw error;
    }

    return null;
  }

  return sdk.getUser();
};
