import { clerk, sessionToken } from "@priemskiyyy/anchor-clerk";

import {
  CLERK_API_TEMPLATE,
  CLERK_ORGANIZATION_IDS,
} from "example-shared/providers/clerk/constants/clerk";
import { createSimulatedClerk } from "example-shared/providers/clerk/createSimulatedClerk";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { PEOPLE } from "example-shared/world/constants/people";

/** Clerk's real adapter over a simulated clerk-js instance that Harbor loads once, as a page does. */
export const createClerkProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedClerk(world);
  const { instance } = simulated;

  // clerk-js rejects load() offline and turns its status to error, which every read reports, so this branch only keeps the rejection handled.
  instance.load().catch(() => {});

  return {
    adapter: clerk({
      sdk: instance,
      tokens: { api: sessionToken({ template: CLERK_API_TEMPLATE }) },
      user: ({ fullName, primaryEmailAddress }) => ({
        name: fullName ?? "",
        email: primaryEmailAddress?.emailAddress ?? "",
      }),
    }),
    signIn: async (person, organization) => {
      const { session } = instance;

      // A Clerk client keeps one signed-in session, so switching people signs this one out first.
      if (session !== null && session !== undefined) {
        await instance.signOut(() => {}, { sessionId: session.id });
      }

      await simulated.signIn(PEOPLE[person].email, organization);
    },
    rename: simulated.updateUser,
    switchOrganization: (organization) =>
      instance.setActive({
        organization: CLERK_ORGANIZATION_IDS[organization],
      }),
    completeAction: simulated.completeTask,
    misbehaviors: {
      "other-tab": simulated.signInElsewhere,
      "duplicate-event": async () => {
        simulated.sendDuplicateEvent();
      },
      "two-factor": simulated.requireTwoFactor,
      "partial-end": async () => {
        simulated.loseNextRemoval();
      },
    },
  };
};
