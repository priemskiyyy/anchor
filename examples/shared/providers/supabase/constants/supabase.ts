import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Supabase, which also keys its sessions in the world. */
export const SUPABASE_ID = "supabase";

/** Each person's Supabase user id. */
export const SUPABASE_USER_IDS: Record<PersonId, string> = {
  ada: "ada0c3f1-5d6e-4f70-8a9b-0c1d2e3f4a5b",
  grace: "6ace7e11-2b3c-4d5e-9f60-718293a4b5c6",
};

/** What the simulated client prefixes its access tokens with. */
export const SUPABASE_TOKEN_PREFIX = "supabase-access-token";

/** The events supabase-js names a change with. */
export const SUPABASE_EVENTS = {
  initialSession: "INITIAL_SESSION",
  signedIn: "SIGNED_IN",
  signedOut: "SIGNED_OUT",
  tokenRefreshed: "TOKEN_REFRESHED",
  userUpdated: "USER_UPDATED",
};

/** What supabase-js answers when a request never reached the server. */
export const RETRYABLE_FETCH_ERROR = {
  name: "AuthRetryableFetchError",
  message: "Failed to fetch",
  status: 0,
};

/** What supabase-js answers for an operation that needs a session when it holds none. */
export const SESSION_MISSING_ERROR = {
  name: "AuthSessionMissingError",
  message: "Auth session missing!",
  status: 400,
};

/** What the server answers a refresh with once the session ended there. */
export const REFRESH_REFUSED_ERROR = {
  name: "AuthApiError",
  message: "Invalid Refresh Token: Session Expired",
  status: 400,
};

/** What the server answers an email and password it does not know with. */
export const INVALID_CREDENTIALS_ERROR = {
  name: "AuthApiError",
  message: "Invalid login credentials",
  status: 400,
};
