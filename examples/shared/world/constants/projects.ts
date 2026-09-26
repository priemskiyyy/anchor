import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { Project } from "example-shared/world/types/Project";

/** Each person's projects in each organization, as Harbor's API answers them. */
export const PROJECTS: Record<OrganizationId, Record<PersonId, Project[]>> = {
  harbor: {
    ada: [
      { id: "tide-tables", name: "Tide tables", notes: 12 },
      { id: "mooring-plan", name: "Mooring plan", notes: 5 },
    ],
    grace: [
      { id: "lighthouse-retrofit", name: "Lighthouse retrofit", notes: 8 },
    ],
  },
  summit: {
    ada: [{ id: "ridge-survey", name: "Ridge survey", notes: 3 }],
    grace: [
      { id: "base-camp", name: "Base camp logistics", notes: 9 },
      { id: "trail-markers", name: "Trail markers", notes: 4 },
    ],
  },
};
