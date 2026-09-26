import type { WorkosSessionUser } from "src/types/WorkosSessionUser";
import type { WorkosUserLike } from "src/types/WorkosUserLike";

export const getWorkosSessionUser = ({
  id,
  email,
  emailVerified,
  firstName,
  lastName,
  profilePictureUrl,
  externalId,
}: WorkosUserLike): WorkosSessionUser => ({
  id,
  email,
  emailVerified,
  firstName,
  lastName,
  profilePictureUrl,
  externalId: externalId ?? null,
});
