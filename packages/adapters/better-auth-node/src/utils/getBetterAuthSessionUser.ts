import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import type { BetterAuthSessionUser } from "src/types/BetterAuthSessionUser";

export const getBetterAuthSessionUser = ({
  id,
  name,
  email,
  emailVerified,
  image,
}: BetterAuthSessionLike["user"]): BetterAuthSessionUser => ({
  id,
  name,
  email,
  emailVerified,
  image: image ?? null,
});
