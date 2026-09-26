import { accessToken, amplify } from "@priemskiyyy/anchor-amplify";

import { USER_ALREADY_AUTHENTICATED_EXCEPTION } from "example-shared/providers/amplify/constants/amplify";
import { createSimulatedAmplify } from "example-shared/providers/amplify/createSimulatedAmplify";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { DEMO_PASSWORD, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";

/** Amplify's real adapter over simulated `aws-amplify/auth` functions and Hub, passed as the `{ auth, hub }` the adapter takes. */
export const createAmplifyProvider = ({
  world,
  sync,
}: ProviderContext): SimulatedProvider => {
  const { auth, hub, signInElsewhere, sendDuplicateEvent } =
    createSimulatedAmplify(world);

  return {
    adapter: amplify({
      sdk: { auth, hub },
      tokens: { api: accessToken() },
      // getCurrentUser() carries no display name, so Harbor looks the person up in its own team directory by the email they signed in with.
      user: ({ signInDetails }) => {
        const email = signInDetails?.loginId ?? "";
        const person = getPersonByEmail(email);

        return { name: person === null ? "" : world.getName(person), email };
      },
    }),
    signIn: async (person) => {
      const input = { username: PEOPLE[person].email, password: DEMO_PASSWORD };

      try {
        await auth.signIn(input);
      } catch (error) {
        if (
          !(error instanceof Error) ||
          error.name !== USER_ALREADY_AUTHENTICATED_EXCEPTION
        ) {
          throw error;
        }

        // Amplify refuses a second user, so switching people signs this one out first.
        await auth.signOut();
        await auth.signIn(input);
      }
    },
    rename: async (name) => {
      await auth.updateUserAttributes({ userAttributes: { name } });
      // An attribute update dispatches nothing on the Hub, so Harbor asks Anchor to read.
      await sync();
    },
    switchOrganization: null,
    completeAction: null,
    misbehaviors: {
      "other-tab": async () => {
        signInElsewhere();
      },
      "duplicate-event": async () => {
        sendDuplicateEvent();
      },
    },
  };
};
