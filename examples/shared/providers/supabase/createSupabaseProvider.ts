import { accessToken, supabase } from "@priemskiyyy/anchor-supabase";

import { createSimulatedSupabase } from "example-shared/providers/supabase/createSimulatedSupabase";
import type { ProviderContext } from "example-shared/providers/types/ProviderContext";
import type { SimulatedProvider } from "example-shared/providers/types/SimulatedProvider";
import { DEMO_PASSWORD, PEOPLE } from "example-shared/world/constants/people";

/** Supabase's real adapter over a simulated supabase-js client, with Harbor's calls on it. */
export const createSupabaseProvider = ({
  world,
}: ProviderContext): SimulatedProvider => {
  const simulated = createSimulatedSupabase(world);
  const { auth } = simulated.sdk;

  return {
    adapter: supabase({
      sdk: simulated.sdk,
      tokens: { api: accessToken() },
      user: ({ email, user_metadata }) => ({ name: user_metadata.name, email }),
    }),
    signIn: async (person) => {
      const { error } = await auth.signInWithPassword({
        email: PEOPLE[person].email,
        password: DEMO_PASSWORD,
      });

      if (error === null) {
        return;
      }

      throw error;
    },
    rename: async (name) => {
      const { error } = await auth.updateUser({ data: { name } });

      if (error === null) {
        return;
      }

      throw error;
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
