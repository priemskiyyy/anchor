import type { LabProvider } from "example-shared/providers/types/LabProvider";

/** What "Load slowly" waits on: a fresh token, or Harbor's API when the provider mints none. */
export const describeSlowLoad = ({ name, capabilities }: LabProvider) =>
  capabilities.credential === "cookie"
    ? "Waiting three seconds for Harbor's API…"
    : `Waiting three seconds for a fresh token from ${name}…`;
