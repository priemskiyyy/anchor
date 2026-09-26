import type { AnchorErrorCode } from "src/types/AnchorErrorCode";
import { AnchorError } from "src/utils/AnchorError";

const ADAPTER_CODES = Object.freeze({
  SESSION_CHANGED: true,
  UNSUPPORTED: true,
  INTERACTION_REQUIRED: true,
  INVALID_CONFIGURATION: true,
} satisfies Partial<Record<AnchorErrorCode, true>>);

export const getOperationError = (
  error: unknown,
  code: AnchorErrorCode,
  message: string,
) => {
  if (
    error instanceof AnchorError &&
    Object.hasOwn(ADAPTER_CODES, error.code)
  ) {
    return error;
  }

  return new AnchorError({ code, message, cause: error });
};
