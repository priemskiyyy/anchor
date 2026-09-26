import { AnchorError } from "@priemskiyyy/anchor";
import type { AnchorErrorCode } from "@priemskiyyy/anchor";

import { API_UNREACHABLE_MESSAGE } from "example-shared/harbor/constants/messages";

const TOKEN_FAILURES: Partial<
  Record<AnchorErrorCode, (label: string) => string>
> = {
  SESSION_CHANGED: () =>
    "The session changed before the token arrived, so Harbor dropped this request.",
  INTERACTION_REQUIRED: (label) =>
    `${label} needs you to sign in again before it sends a token.`,
  ACTION_REQUIRED: () =>
    "Finish the pending step first: a blocked session mints no tokens.",
  TOKEN_FAILED: (label) => `${label} could not send a token.`,
  TIMEOUT: (label) => `${label} took too long to send a token.`,
  DISPOSED: () => "Harbor restarted before the token arrived.",
};

/** Why Harbor could not load a session's projects, in one sentence and without the provider's own error. */
export const describeWorkspaceFailure = (
  error: unknown,
  provider: { label: string },
) => {
  if (!(error instanceof AnchorError)) {
    return API_UNREACHABLE_MESSAGE;
  }

  const describe = TOKEN_FAILURES[error.code];

  if (describe === undefined) {
    return `The token request failed with ${error.code}.`;
  }

  return describe(provider.label);
};
