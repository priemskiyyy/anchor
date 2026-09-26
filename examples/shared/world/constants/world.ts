import type { WorldState } from "example-shared/world/types/WorldState";

/** How long a slow provider call, a token refresh and a slow load take, in milliseconds. */
export const SLOW_LATENCY = 3_000;

/** What the page shows before anything happened: online, fast, no provider call yet. */
export const INITIAL_WORLD_STATE: WorldState = {
  online: true,
  slow: false,
  calls: 0,
};

/** What fetch throws when the network is down, which every simulated SDK receives. */
export const NETWORK_FAILURE = "Failed to fetch";

/** Harbor's own origin, on a domain reserved for examples. */
export const HARBOR_ORIGIN = "https://harbor.example";

/** Harbor's API, the audience of its tokens and the authority of your own backend. */
export const HARBOR_API_ORIGIN = "https://api.harbor.example";
