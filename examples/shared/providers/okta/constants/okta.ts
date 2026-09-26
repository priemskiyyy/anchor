import type { PersonId } from "example-shared/world/types/PersonId";

/** The catalog id of Okta, which also keys its sessions in the world. */
export const OKTA_ID = "okta";

/** The issuer of the simulated authorization server, on Okta's domain for a made-up org. */
export const OKTA_ISSUER = "https://harbor-lab.okta.com/oauth2/default";

/** The authorization server's sign-out page. */
export const OKTA_LOGOUT_URL = `${OKTA_ISSUER}/v1/logout`;

/** Each person's Okta user id. */
export const OKTA_SUBJECTS: Record<PersonId, string> = {
  ada: "00uada7Mr2xKq9Lp5d7",
  grace: "00ugrc6Ok3wBn8Zt4d7",
};

/** What the simulated instance prefixes its access tokens with. */
export const OKTA_TOKEN_PREFIX = "okta-access-token";

/** When the simulated tokens expire, in seconds since the epoch, as okta-auth-js counts: far enough never to matter. */
export const OKTA_TOKEN_EXPIRY = 4_102_444_800;

/** The token manager's own key for the access token. */
export const ACCESS_TOKEN_KEY = "accessToken";
