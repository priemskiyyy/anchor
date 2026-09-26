import type { InjectionKey } from "vue";

import type { SessionLab } from "example-shared/lab/types/SessionLab";

/** Where `Application.vue` provides the lab to every component below it. */
export const LAB_KEY: InjectionKey<SessionLab> = Symbol("session-lab");
