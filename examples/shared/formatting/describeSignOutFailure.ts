import { formatErrorCode } from "example-shared/formatting/formatErrorCode";

/** Why a sign-out did not end the session, which stays signed in. */
export const describeSignOutFailure = (error: unknown) =>
  `Harbor could not sign you out (${formatErrorCode(error)}): you are still signed in.`;
