import type { LabProvider } from "example-shared/providers/types/LabProvider";
import type { ProviderCapabilities } from "example-shared/providers/types/ProviderCapabilities";

const CREDENTIALS: Record<ProviderCapabilities["credential"], string> = {
  "id-token": "mints ID tokens",
  "access-token": "mints access tokens",
  "session-token": "mints session tokens",
  cookie: "a cookie session, no tokens",
};

/** A provider's capabilities as the short phrases Harbor's status bar lists. */
export const describeCapabilities = ({ capabilities }: LabProvider) => [
  capabilities.observation === "push"
    ? "pushes every change"
    : "emits nothing, so Anchor reads again",
  CREDENTIALS[capabilities.credential],
  capabilities.organizations ? "organizations" : "no organizations",
  capabilities.navigation ? "a logout page" : "no logout page",
];
