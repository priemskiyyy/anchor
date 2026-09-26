import { betterAuth } from "@priemskiyyy/anchor-better-auth";

import { createSimulatedBetterAuthClient } from "example-shared/providers/betterAuth/createSimulatedBetterAuthClient";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { DEMO_PASSWORD, PEOPLE } from "example-shared/world/constants/people";

/** Better Auth's real adapter over a simulated Better Auth client, with Harbor's calls on it. */
export const createBetterAuthProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedBetterAuthClient(world);
  const { client } = simulated;

  const adapter = betterAuth({
    sdk: client,
    user: ({ name, email }) => ({ name, email }),
  });

  return {
    // Better Auth mints no tokens, so its adapter declares no profile; the type widens to the one Anchor every provider shares, and Harbor never asks it for a token.
    adapter: {
      name: adapter.name,
      native: adapter.native,
      tokens: {},
      open: (observer) => {
        const session = adapter.open(observer);

        return {
          read: session.read,
          ...(session.end === undefined ? {} : { end: session.end }),
          ...(session.dispose === undefined
            ? {}
            : { dispose: session.dispose }),
        };
      },
    },
    signIn: async (person) => {
      const { error } = await client.signIn.email({
        email: PEOPLE[person].email,
        password: DEMO_PASSWORD,
      });

      if (error === null) {
        return;
      }

      throw new Error(error.statusText);
    },
    rename: async (name) => {
      const { error } = await client.updateUser({ name });

      if (error === null) {
        return;
      }

      throw new Error(error.statusText);
    },
    switchOrganization: async (organization) => {
      const { error } = await client.organization.setActive({
        organizationId: organization,
      });

      if (error === null) {
        return;
      }

      throw new Error(error.statusText);
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
