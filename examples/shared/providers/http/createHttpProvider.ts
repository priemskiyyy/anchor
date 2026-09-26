import { http } from "@priemskiyyy/anchor-http";

import { createHarborBackend } from "example-shared/providers/http/createHarborBackend";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { HARBOR_API_ORIGIN } from "example-shared/world/constants/world";

/** The http adapter over Harbor's own backend client. Your backend emits nothing, so every call Harbor makes is followed by `anchor.sync()`. */
export const createHttpProvider = ({
  world,
  sync,
}: ProviderContext): SimulatedProvider => {
  const backend = createHarborBackend(world);

  return {
    adapter: http({
      authority: HARBOR_API_ORIGIN,
      read: backend.getSession,
      end: backend.endSession,
      tokens: { api: backend.mintToken },
    }),
    signIn: async (person, organization) => {
      await backend.signIn(person, organization);
      await sync();
    },
    rename: async (name) => {
      await backend.updateProfile(name);
      await sync();
    },
    switchOrganization: async (organization) => {
      await backend.switchOrganization(organization);
      await sync();
    },
    completeAction: async () => {
      await backend.completeTwoFactor();
      await sync();
    },
    misbehaviors: {
      "other-tab": async () => {
        backend.signInElsewhere();
      },
      "two-factor": async () => {
        backend.requireTwoFactor();
        await sync();
      },
    },
  };
};
