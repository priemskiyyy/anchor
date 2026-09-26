import type { Organization } from "example-shared/world/types/Organization";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { Project } from "example-shared/world/types/Project";

/** Harbor's projects for one session key: loading, loaded from its API, or failed. */
export type WorkspaceView =
  | { status: "loading"; slowly: boolean }
  | {
      status: "ready";
      person: PersonId;
      organization: Organization;
      projects: Project[];
      credential: "token" | "cookie";
    }
  | { status: "failed"; message: string };
