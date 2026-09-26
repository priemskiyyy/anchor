import { accessToken, auth0 } from "@priemskiyyy/anchor-auth0";

import { AUTH0_ORGANIZATIONS } from "example-shared/providers/auth0/constants/auth0";
import { createSimulatedAuth0Client } from "example-shared/providers/auth0/createSimulatedAuth0Client";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { PEOPLE } from "example-shared/world/constants/people";
import {
  HARBOR_API_ORIGIN,
  HARBOR_ORIGIN,
} from "example-shared/world/constants/world";

/** Auth0's real adapter over a simulated auth0-spa-js client. Auth0 emits nothing, so every call Harbor makes is followed by `anchor.sync()`, as its README says. */
export const createAuth0Provider = ({
  world,
  sync,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedAuth0Client(world);
  const { client } = simulated;

  return {
    adapter: auth0({
      sdk: client,
      tokens: { api: accessToken({ audience: HARBOR_API_ORIGIN }) },
      returnTo: HARBOR_ORIGIN,
      user: ({ name, email }) => ({ name, email }),
    }),
    signIn: async (person, organization) => {
      await client.loginWithPopup({
        authorizationParams: {
          login_hint: PEOPLE[person].email,
          organization: AUTH0_ORGANIZATIONS[organization],
        },
      });
      await sync();
    },
    rename: async (name) => {
      await simulated.updateUser(name);
      await sync();
    },
    switchOrganization: async (organization) => {
      const claims = await client.getIdTokenClaims();

      if (claims === undefined) {
        return;
      }

      await client.loginWithPopup({
        authorizationParams: {
          login_hint: claims.email,
          organization: AUTH0_ORGANIZATIONS[organization],
        },
      });
      await sync();
    },
    completeAction: null,
    misbehaviors: {
      "other-tab": async () => {
        simulated.signInElsewhere();
      },
    },
  };
};
