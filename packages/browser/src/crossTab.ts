import type { SyncHint } from "@priemskiyyy/anchor";

import type { CrossTabOptions } from "src/types/CrossTabOptions";
import {
  CHANNEL_PREFIX,
  INVALIDATION_MESSAGE,
} from "src/utils/constants/crossTab";

/**
 * Tells the application's other tabs to read the session again after this
 * tab's session changes status or key, through a `BroadcastChannel`. The
 * message is only a reason to read: it carries no token, key or state, so a
 * tab never takes another tab's word for who is signed in. Where there is no
 * `BroadcastChannel`, it installs nothing.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({ adapter, hints: [crossTab({ name: "dashboard" })] });
 * ```
 */
export const crossTab =
  ({ name }: CrossTabOptions): SyncHint =>
  ({ sync, session }) => {
    if (typeof BroadcastChannel === "undefined") {
      return () => {};
    }

    const channel = new BroadcastChannel(`${CHANNEL_PREFIX}${name}`);
    let last = session.get();

    const handleMessage = ({ data }: MessageEvent<unknown>) => {
      if (data !== INVALIDATION_MESSAGE) {
        return;
      }

      sync();
    };

    const handleSessionChange = () => {
      const current = session.get();
      const previous = last;

      last = current;

      // The first resolution of a tab is no news to the others, which read the same provider.
      if (
        previous.status === "initializing" ||
        (previous.status === current.status && previous.key === current.key)
      ) {
        return;
      }

      channel.postMessage(INVALIDATION_MESSAGE);
    };

    channel.addEventListener("message", handleMessage);

    const unsubscribe = session.subscribe(handleSessionChange);

    // A closed channel receives nothing, so its listener goes with it.
    return () => {
      unsubscribe();
      channel.close();
    };
  };
