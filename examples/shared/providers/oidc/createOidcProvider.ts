import { accessToken, oidc } from "@priemskiyyy/anchor-oidc";

import { OIDC_ORGANIZATIONS } from "example-shared/providers/oidc/constants/oidc";
import { createSimulatedUserManager } from "example-shared/providers/oidc/createSimulatedUserManager";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";

/** The OpenID Connect adapter over a simulated oidc-client-ts UserManager, with Harbor's calls on it. */
export const createOidcProvider = ({
  world,
  sync,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedUserManager(world);
  const { manager } = simulated;

  return {
    adapter: oidc({
      sdk: manager,
      tokens: { api: accessToken() },
      user: ({ name, email }) => ({ name, email }),
    }),
    signIn: (person, organization) =>
      manager.signinPopup({
        login_hint: PEOPLE[person].email,
        extraQueryParams: { organization: OIDC_ORGANIZATIONS[organization] },
      }),
    rename: simulated.updateProfile,
    switchOrganization: async (organization) => {
      const person = simulated.getStoredPerson();

      if (person === null) {
        return;
      }

      await manager.signinPopup({
        login_hint: PEOPLE[person].email,
        extraQueryParams: { organization: OIDC_ORGANIZATIONS[organization] },
      });
    },
    completeAction: null,
    misbehaviors: {
      "duplicate-event": simulated.sendDuplicateEvent,
      // A read starts, its answer is held for three seconds, and the other person signs in meanwhile.
      "stale-callback": async () => {
        const person = simulated.getStoredPerson();

        if (person === null) {
          return;
        }

        simulated.armStaleRead();

        const reading = sync();

        await manager.signinPopup({
          login_hint: PEOPLE[OTHER_PEOPLE[person]].email,
        });
        await reading;
      },
      "partial-end": async () => {
        simulated.armMetadataFailure();
      },
    },
  };
};
