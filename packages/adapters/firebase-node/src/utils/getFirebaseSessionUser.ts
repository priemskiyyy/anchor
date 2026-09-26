import type { FirebaseDecodedTokenLike } from "src/types/FirebaseDecodedTokenLike";
import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";

export const getFirebaseSessionUser = ({
  uid,
  email,
  email_verified,
  name,
  picture,
  phone_number,
}: FirebaseDecodedTokenLike): FirebaseSessionUser => ({
  uid,
  email: email ?? null,
  emailVerified: email_verified ?? false,
  displayName: name ?? null,
  photoURL: picture ?? null,
  phoneNumber: phone_number ?? null,
});
