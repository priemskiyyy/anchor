import { accessToken, keycloak } from "@priemskiyyy/anchor-keycloak";

import {
  KEYCLOAK_ORGANIZATIONS,
  ORGANIZATION_SCOPE,
} from "example-shared/providers/keycloak/constants/keycloak";
import { createSimulatedKeycloak } from "example-shared/providers/keycloak/createSimulatedKeycloak";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { PEOPLE } from "example-shared/world/constants/people";

/** Keycloak's real adapter over a simulated keycloak-js instance that Harbor initializes once, as a page does. */
export const createKeycloakProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedKeycloak(world);
  const { instance } = simulated;
  const initialized = instance.init();

  // keycloak-js rejects init() offline and every read reports it, so this branch only keeps the rejection handled.
  initialized.catch(() => {});

  return {
    adapter: keycloak({
      sdk: instance,
      initialized,
      tokens: { api: accessToken() },
      user: ({ name, email }) => ({ name: name ?? "", email: email ?? "" }),
    }),
    signIn: (person, organization) =>
      instance.login({
        loginHint: PEOPLE[person].email,
        scope: `${ORGANIZATION_SCOPE}${KEYCLOAK_ORGANIZATIONS[organization]}`,
      }),
    rename: simulated.updateProfile,
    switchOrganization: async (organization) => {
      const person = simulated.getHeldPerson();

      if (person === null) {
        return;
      }

      await instance.login({
        loginHint: PEOPLE[person].email,
        scope: `${ORGANIZATION_SCOPE}${KEYCLOAK_ORGANIZATIONS[organization]}`,
      });
    },
    completeAction: null,
    misbehaviors: {
      "duplicate-event": async () => {
        simulated.sendDuplicateEvent();
      },
      "partial-end": async () => {
        simulated.armLogoutUrlFailure();
      },
    },
  };
};
