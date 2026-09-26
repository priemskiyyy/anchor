import type { Auth0Like } from "src/types/Auth0Like";
import { NO_CREDENTIALS } from "src/utils/constants/auth0";
import { getCredentialsErrorType } from "src/utils/getCredentialsErrorType";

export const getStoredCredentials = async (sdk: Auth0Like) => {
  if (!(await sdk.credentialsManager.hasValidCredentials())) {
    return null;
  }

  try {
    return await sdk.credentialsManager.getCredentials();
  } catch (error) {
    if (getCredentialsErrorType(error) !== NO_CREDENTIALS) {
      throw error;
    }

    return null;
  }
};
