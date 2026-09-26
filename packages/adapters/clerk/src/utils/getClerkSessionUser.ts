import type { ClerkSessionUser } from "src/types/ClerkSessionUser";
import type { ClerkUserLike } from "src/types/ClerkUserLike";

export const getClerkSessionUser = ({
  id,
  externalId,
  username,
  firstName,
  lastName,
  fullName,
  imageUrl,
  primaryEmailAddress,
  primaryPhoneNumber,
}: ClerkUserLike): ClerkSessionUser => ({
  id,
  externalId,
  username,
  firstName,
  lastName,
  fullName,
  imageUrl,
  primaryEmailAddress: primaryEmailAddress?.emailAddress ?? null,
  primaryPhoneNumber: primaryPhoneNumber?.phoneNumber ?? null,
});
