import {
  EXPIRED_SESSION_TOKEN_REASON,
  SIGNED_OUT_REASONS,
  SIGNED_OUT_REFRESH_OUTCOMES,
} from "src/utils/constants/clerk";

export const isSignedOutReason = (reason: string) => {
  if (SIGNED_OUT_REASONS.includes(reason)) {
    return true;
  }

  if (!reason.startsWith(EXPIRED_SESSION_TOKEN_REASON)) {
    return false;
  }

  return SIGNED_OUT_REFRESH_OUTCOMES.includes(
    reason.slice(EXPIRED_SESSION_TOKEN_REASON.length),
  );
};
