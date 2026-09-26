import type { SyncHint } from "@priemskiyyy/anchor";

/**
 * Reads the session again when the page becomes visible, so a sign-out in
 * another tab or an expired session shows as soon as the user looks. Outside
 * a browser it installs nothing.
 *
 * @example
 * ```ts
 * const anchor = new Anchor({ adapter, hints: [visibility()] });
 * ```
 */
export const visibility =
  (): SyncHint =>
  ({ sync }) => {
    if (typeof document === "undefined") {
      return () => {};
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      sync();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
