/** How one provider answers one misbehavior: what happens when it can, or why it cannot. */
export type ProviderBehavior =
  { available: true; outcome: string } | { available: false; reason: string };
