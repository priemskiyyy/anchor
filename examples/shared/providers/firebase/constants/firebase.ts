import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Firebase, which also keys its sessions in the world. */
export const FIREBASE_ID = "firebase";

/** The Firebase project the simulated Auth instance belongs to, which names the issuer. */
export const FIREBASE_PROJECT_ID = "harbor-lab";

/** Each person's Firebase uid. */
export const FIREBASE_UIDS: Record<PersonId, string> = {
  ada: "q7Vd9AdaM2pL3xRm8KfN1sTz4Yw2",
  grace: "h2Lk5GrcO8wQ1vB6nC3pX9sRt7Ma",
};

/** What the simulated SDK prefixes its ID tokens with, so Harbor's API can tell whose they are. */
export const FIREBASE_TOKEN_PREFIX = "firebase-id-token";

/** Firebase's code for a request that never reached its servers. */
export const NETWORK_REQUEST_FAILED = "auth/network-request-failed";

/** Firebase's code for a credential the server no longer accepts, so the user must sign in again. */
export const USER_TOKEN_EXPIRED = "auth/user-token-expired";

/** Firebase's code for an email and password it does not know. */
export const INVALID_CREDENTIAL = "auth/invalid-credential";
