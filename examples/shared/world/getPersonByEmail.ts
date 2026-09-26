import { PEOPLE, PERSON_IDS } from "example-shared/world/constants/people";

/** The person an email belongs to, or `null` for someone Harbor does not know. */
export const getPersonByEmail = (email: string) =>
  PERSON_IDS.find((person) => PEOPLE[person].email === email) ?? null;
