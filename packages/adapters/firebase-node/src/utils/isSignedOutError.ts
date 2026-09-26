import type { FirebaseCredential } from "src/types/internal/FirebaseCredential";
import {
  ARGUMENT_ERROR_CODE,
  CREDENTIAL_NAMES,
  SIGNED_OUT_ERROR_CODES,
} from "src/utils/constants/firebase";

export const isSignedOutError = (
  error: unknown,
  credential: FirebaseCredential["kind"],
) => {
  if (
    !(error instanceof Error) ||
    !("code" in error) ||
    typeof error.code !== "string"
  ) {
    return false;
  }

  // firebase-admin answers auth/argument-error for a credential it refuses and for a failure to fetch Google's public keys alike, and only its refusals name the credential.
  return (
    SIGNED_OUT_ERROR_CODES.includes(error.code) ||
    (error.code === ARGUMENT_ERROR_CODE &&
      error.message.includes(CREDENTIAL_NAMES[credential]))
  );
};
