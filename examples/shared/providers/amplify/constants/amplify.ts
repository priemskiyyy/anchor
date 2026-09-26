import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Amplify, which also keys its sessions in the world. */
export const AMPLIFY_ID = "amplify";

/** The Cognito user pool that issues the simulated tokens, the principal's authority. */
export const COGNITO_ISSUER =
  "https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_HarborLab";

/** Each person's `sub` in the user pool, which is also their Cognito username. */
export const COGNITO_SUBJECTS: Record<PersonId, string> = {
  ada: "4a1b2c3d-ada5-4e6f-8a7b-9c0d1e2f3a4b",
  grace: "8c3d4e5f-9ace-4a7b-9c8d-0e1f2a3b4c5d",
};

/** What the simulated Cognito prefixes its access tokens with. */
export const COGNITO_TOKEN_PREFIX = "cognito-access-token";

/** Cognito's answer to a refresh token it revoked or no longer knows. */
export const NOT_AUTHORIZED_EXCEPTION = "NotAuthorizedException";

/** What Amplify throws when a sign-in starts while a user is signed in. */
export const USER_ALREADY_AUTHENTICATED_EXCEPTION =
  "UserAlreadyAuthenticatedException";
