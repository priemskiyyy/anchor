import { firebase, idToken } from "@priemskiyyy/anchor-firebase";

import { createSimulatedFirebaseAuth } from "example-shared/providers/firebase/createSimulatedFirebaseAuth";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { DEMO_PASSWORD, PEOPLE } from "example-shared/world/constants/people";

/** Firebase's real adapter over a simulated modular Auth instance, with Harbor's calls on it. */
export const createFirebaseProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedFirebaseAuth(world);

  return {
    adapter: firebase({
      sdk: simulated.auth,
      tokens: { api: idToken() },
      user: ({ displayName, email }) => ({
        name: displayName ?? "",
        email: email ?? "",
      }),
    }),
    signIn: (person) =>
      simulated.signInWithEmailAndPassword(PEOPLE[person].email, DEMO_PASSWORD),
    rename: async (name) => {
      const user = simulated.auth.currentUser;

      if (user === null) {
        return;
      }

      await simulated.updateProfile(user, { displayName: name });
    },
    switchOrganization: null,
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
