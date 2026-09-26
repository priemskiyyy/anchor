import type { Person } from "example-shared/world/types/Person";
import type { PersonId } from "example-shared/world/types/PersonId";

/** The two made-up people who use Harbor. */
export const PEOPLE: Record<PersonId, Person> = {
  ada: {
    id: "ada",
    firstName: "Ada",
    name: "Ada Moreau",
    shortName: "Ada M.",
    email: "ada@harbor.example",
    initials: "AM",
    tone: "accent",
    organization: "harbor",
  },
  grace: {
    id: "grace",
    firstName: "Grace",
    name: "Grace Okafor",
    shortName: "Grace O.",
    email: "grace@harbor.example",
    initials: "GO",
    tone: "positive",
    organization: "summit",
  },
};

/** The person the account switcher and another tab sign in, from each person. */
export const OTHER_PEOPLE: Record<PersonId, PersonId> = {
  ada: "grace",
  grace: "ada",
};

/** Every person, in the order the sign-in card lists them. */
export const PERSON_IDS: PersonId[] = ["ada", "grace"];

/** The password every made-up person signs in with; nothing checks it. */
export const DEMO_PASSWORD = "harbor-demo";
