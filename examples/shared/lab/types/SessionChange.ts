/** Why the session key changed, or why it stayed although the session did. */
export type SessionChange = {
  id: number;
  kind: "new-key" | "same-key" | "no-key";
  reason: string;
};
