import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";

// Better Auth answers an HTTP failure as { error } and lets a network failure throw, and ending treats both alike.
export const getSignOutOutcome = async (
  sdk: BetterAuthClientLike,
): Promise<{ failed: false } | { failed: true; error: unknown }> => {
  try {
    const { error } = await sdk.signOut();

    return error === null ? { failed: false } : { failed: true, error };
  } catch (error) {
    return { failed: true, error };
  }
};
