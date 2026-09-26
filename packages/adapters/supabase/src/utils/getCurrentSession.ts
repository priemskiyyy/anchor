import type { SupabaseClientLike } from "src/types/SupabaseClientLike";

export const getCurrentSession = async (sdk: SupabaseClientLike) => {
  const { data, error } = await sdk.auth.getSession();

  if (error !== null) {
    throw error;
  }

  return data.session;
};
