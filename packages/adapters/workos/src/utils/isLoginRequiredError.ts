import { LOGIN_REQUIRED_MESSAGE } from "src/utils/constants/workos";

// authkit-js gives LoginRequiredError no name or code of its own, so its message is what tells it apart.
export const isLoginRequiredError = (error: unknown) =>
  error instanceof Error && error.message === LOGIN_REQUIRED_MESSAGE;
