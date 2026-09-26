import type { AuthjsSessionLike } from "src/types/AuthjsSessionLike";
import type { AuthjsSessionUser } from "src/types/AuthjsSessionUser";

export const getAuthjsSessionUser = ({
  user,
}: AuthjsSessionLike): AuthjsSessionUser => ({
  id: user?.id ?? "",
  name: user?.name ?? null,
  email: user?.email ?? null,
  image: user?.image ?? null,
});
