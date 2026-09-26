import type { SyncHint } from "@priemskiyyy/anchor";

/**
 * Reads the session again when the browser comes back online, so a read that
 * failed offline is retried once it can succeed. Outside a browser it
 * installs nothing.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({ adapter, hints: [online()] });
 * ```
 */
export const online =
  (): SyncHint =>
  ({ sync }) => {
    if (typeof window === "undefined") {
      return () => {};
    }

    const handleOnline = () => sync();

    window.addEventListener("online", handleOnline);

    return () => window.removeEventListener("online", handleOnline);
  };
