import { accessToken, msal } from "@priemskiyyy/anchor-msal";

import {
  MSAL_API_SCOPES,
  MSAL_AUTHORITY_ORIGIN,
  MSAL_TENANTS,
} from "example-shared/providers/msal/constants/msal";
import { createSimulatedMsalClient } from "example-shared/providers/msal/createSimulatedMsalClient";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { PEOPLE } from "example-shared/world/constants/people";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";

const getAuthority = (organization: OrganizationId) =>
  `${MSAL_AUTHORITY_ORIGIN}${MSAL_TENANTS[organization]}`;

/** MSAL's real adapter over a simulated PublicClientApplication that Harbor initializes once, as a page does, and hands the adapter as `initialized`. */
export const createMsalProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedMsalClient(world);
  const { client } = simulated;

  // Every read waits for this, so an Anchor started while MSAL loads its cache is initializing, never signed out.
  const initialized = client.initialize();

  const signInToTenant = async (
    loginHint: string,
    organization: OrganizationId,
  ) => {
    const { account } = await client.loginPopup({
      loginHint,
      authority: getAuthority(organization),
      scopes: MSAL_API_SCOPES,
    });

    // Only the application chooses the signed-in account, so Harbor makes the new one active.
    client.setActiveAccount(account);
  };

  return {
    adapter: msal({
      sdk: client,
      initialized,
      tokens: { api: accessToken({ scopes: MSAL_API_SCOPES }) },
      user: ({ name, username }) => ({ name: name ?? "", email: username }),
    }),
    signIn: (person, organization) =>
      signInToTenant(PEOPLE[person].email, organization),
    rename: simulated.updateProfile,
    // Another organization is another tenant: the same account, signed in to that tenant's profile.
    switchOrganization: async (organization) => {
      const account = client.getActiveAccount();

      if (account === null) {
        return;
      }

      await signInToTenant(account.username, organization);
    },
    completeAction: null,
    misbehaviors: {
      "other-tab": async () => {
        simulated.signInElsewhere();
      },
      "duplicate-event": async () => {
        simulated.sendDuplicateEvent();
      },
    },
  };
};
