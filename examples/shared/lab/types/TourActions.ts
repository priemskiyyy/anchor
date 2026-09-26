import type { AnchorDiagnosticType } from "@priemskiyyy/anchor";

import type { DevtoolsControls } from "example-shared/lab/types/DevtoolsControls";
import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";

/** What a tour step can do: Harbor's own calls, the lab's controls, and waits for the proof to arrive. */
export type TourActions = {
  signIn: (person: PersonId) => Promise<void>;
  signOut: () => Promise<void>;
  switchOrganization: (organization: OrganizationId) => Promise<void>;
  rename: () => Promise<void>;
  startLoadingProjects: (options: { slowly: boolean }) => void;
  loadProjects: (options: { slowly: boolean }) => Promise<void>;
  retry: () => Promise<void>;
  reload: () => Promise<void>;
  selectProvider: (id: string) => Promise<void>;
  setOnline: (online: boolean) => void;
  misbehave: (id: MisbehaviorId) => Promise<void>;
  /** Resolves once the timeline holds an event of one of these types recorded since the tour began. */
  waitForEvent: (types: AnchorDiagnosticType[]) => Promise<void>;
  /** Resolves once the signed-in session's projects loaded or failed, or nobody is signed in. */
  waitForProjects: () => Promise<void>;
  /** Resolves once no session's projects are loading any more. */
  waitForLoads: () => Promise<void>;
  devtools: DevtoolsControls;
};
