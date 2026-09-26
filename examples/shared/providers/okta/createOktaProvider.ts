import { accessToken, okta } from "@priemskiyyy/anchor-okta";

import { createSimulatedOktaAuth } from "example-shared/providers/okta/createSimulatedOktaAuth";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { PEOPLE } from "example-shared/world/constants/people";

/** Okta's real adapter over a simulated okta-auth-js instance, with Harbor's calls on it. */
export const createOktaProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedOktaAuth(world);
  const { oktaAuth } = simulated;

  return {
    adapter: okta({
      sdk: oktaAuth,
      tokens: { api: accessToken() },
      user: ({ name, email }) => ({ name, email }),
    }),
    signIn: async (person) => {
      const { tokens } = await oktaAuth.token.getWithPopup({
        loginHint: PEOPLE[person].email,
      });

      oktaAuth.tokenManager.setTokens(tokens);
    },
    rename: simulated.updateProfile,
    switchOrganization: null,
    completeAction: null,
    misbehaviors: {
      "other-tab": async () => {
        simulated.signInElsewhere();
      },
      "partial-end": async () => {
        simulated.armSignOutUrlFailure();
      },
    },
  };
};
