import type { EndResult, EndStep } from "@priemskiyyy/anchor";

const LOCAL_STEPS: Record<EndStep, string> = {
  completed: "Signed out on this device.",
  "not-applicable": "This device no longer held the session.",
  unknown: "This device may still hold the session.",
};

const REMOTE_STEPS: Record<EndStep, (label: string) => string> = {
  completed: (label) => `${label} ended its own session too.`,
  "not-applicable": (label) => `${label} has no session of its own to end.`,
  unknown: (label) => `${label}'s own session may still be open.`,
};

/** What an ending proved, as the sentences Harbor shows after a sign-out. */
export const describeEndResult = (
  { local, remote }: EndResult,
  provider: { label: string },
) => [LOCAL_STEPS[local], REMOTE_STEPS[remote](provider.label)];
