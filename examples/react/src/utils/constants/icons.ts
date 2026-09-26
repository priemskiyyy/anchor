import {
  Browsers,
  CloudX,
  Ghost,
  HourglassMedium,
  Repeat,
  ShieldCheck,
  SignOut,
  WifiSlash,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import type { MisbehaviorId } from "example-shared/providers/types/MisbehaviorId";

/** Each misbehavior's icon in the panel. */
export const MISBEHAVIOR_ICONS: Record<MisbehaviorId, Icon> = {
  "other-tab": Browsers,
  "server-end": CloudX,
  offline: WifiSlash,
  slow: HourglassMedium,
  "duplicate-event": Repeat,
  "stale-callback": Ghost,
  "two-factor": ShieldCheck,
  "partial-end": SignOut,
};
