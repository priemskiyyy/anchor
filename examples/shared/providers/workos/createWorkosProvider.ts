import {
  accessToken,
  workos,
  workosRefreshes,
} from "@priemskiyyy/anchor-workos";

import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { WORKOS_ORGANIZATION_IDS } from "example-shared/providers/workos/constants/workos";
import { createSimulatedAuthKitClient } from "example-shared/providers/workos/createSimulatedAuthKitClient";
import { PEOPLE } from "example-shared/world/constants/people";

/** WorkOS's real adapter over a simulated AuthKit client, created with the relay's two handlers as its callbacks. */
export const createWorkosProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  // AuthKit takes its callbacks only when createClient() creates the client, so the relay comes first.
  const refreshes = workosRefreshes();

  const { client, updateUser, refreshAutomatically } =
    createSimulatedAuthKitClient(world, {
      onRefresh: refreshes.handleRefresh,
      onRefreshFailure: refreshes.handleRefreshFailure,
    });

  return {
    adapter: workos({
      sdk: client,
      refreshes,
      tokens: { api: accessToken() },
      user: ({ firstName, lastName, email }) => ({
        name:
          lastName === null
            ? (firstName ?? "")
            : `${firstName ?? ""} ${lastName}`,
        email,
      }),
    }),
    signIn: (person, organization) =>
      client.signIn({
        loginHint: PEOPLE[person].email,
        organizationId: WORKOS_ORGANIZATION_IDS[organization],
      }),
    rename: updateUser,
    switchOrganization: (organization) =>
      client.switchToOrganization({
        organizationId: WORKOS_ORGANIZATION_IDS[organization],
      }),
    completeAction: null,
    misbehaviors: { "duplicate-event": refreshAutomatically },
  };
};
