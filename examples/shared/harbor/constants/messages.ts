/** What Harbor says when a sign-in never reached the provider. */
export const SIGN_IN_FAILED_MESSAGE =
  "We can't reach the sign-in service. Try again.";

/** What Harbor says when Retry read the provider and failed again. */
export const RETRY_FAILED_MESSAGE = "Still no answer from the sign-in service.";

/** What Harbor says when its API answered 401 for a session the server ended. */
export const SESSION_ENDED_MESSAGE =
  "Harbor's API says this session ended on the server, so Harbor asked the provider again.";

/** What Harbor says when an organization switch never reached the provider. */
export const ORGANIZATION_FAILED_MESSAGE =
  "Harbor could not switch organizations: the provider could not be reached.";

/** What Harbor says when a rename never reached the provider. */
export const RENAME_FAILED_MESSAGE =
  "Harbor could not rename you: the provider could not be reached.";

/** What Harbor says when finishing two-factor never reached your backend. */
export const ACTION_FAILED_MESSAGE =
  "Two-factor could not be set up: your backend could not be reached.";

/** What Harbor says when its API could not be reached at all. */
export const API_UNREACHABLE_MESSAGE = "Harbor's API can't be reached.";
