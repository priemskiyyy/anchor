import { AMPLIFY_PROVIDER } from "example-shared/providers/constants/amplifyProvider";
import { AUTH0_PROVIDER } from "example-shared/providers/constants/auth0Provider";
import { BETTER_AUTH_PROVIDER } from "example-shared/providers/constants/betterAuthProvider";
import { CLERK_PROVIDER } from "example-shared/providers/constants/clerkProvider";
import { FIREBASE_PROVIDER } from "example-shared/providers/constants/firebaseProvider";
import { HTTP_PROVIDER } from "example-shared/providers/constants/httpProvider";
import { KEYCLOAK_PROVIDER } from "example-shared/providers/constants/keycloakProvider";
import { MSAL_PROVIDER } from "example-shared/providers/constants/msalProvider";
import { OIDC_PROVIDER } from "example-shared/providers/constants/oidcProvider";
import { OKTA_PROVIDER } from "example-shared/providers/constants/oktaProvider";
import { SUPABASE_PROVIDER } from "example-shared/providers/constants/supabaseProvider";
import { WORKOS_PROVIDER } from "example-shared/providers/constants/workosProvider";
import type { LabProvider } from "example-shared/providers/types/LabProvider";

/**
 * Every provider the picker lists, in its order; a provider is one more entry here.
 * Auth.js is left out: its adapter reads `{basePath}/session` with the global `fetch`, and simulating that would mean patching the global `fetch`, which an example should never teach.
 */
export const PROVIDER_CATALOG: LabProvider[] = [
  FIREBASE_PROVIDER,
  SUPABASE_PROVIDER,
  AUTH0_PROVIDER,
  BETTER_AUTH_PROVIDER,
  OIDC_PROVIDER,
  KEYCLOAK_PROVIDER,
  OKTA_PROVIDER,
  MSAL_PROVIDER,
  AMPLIFY_PROVIDER,
  CLERK_PROVIDER,
  WORKOS_PROVIDER,
  HTTP_PROVIDER,
];
