import type { Organization } from "example-shared/world/types/Organization";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { Project } from "example-shared/world/types/Project";

/** What Harbor's API answers for a credential: that person's projects in that organization, or a 401. */
export type WorkspaceAnswer =
  | {
      status: "ok";
      person: PersonId;
      organization: Organization;
      projects: Project[];
    }
  | { status: "unauthorized" };
