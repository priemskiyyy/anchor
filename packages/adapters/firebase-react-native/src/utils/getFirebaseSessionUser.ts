import type { FirebaseSessionUser } from "src/types/FirebaseSessionUser";
import type { FirebaseUserLike } from "src/types/FirebaseUserLike";

export const getFirebaseSessionUser = ({
  uid,
  email,
  emailVerified,
  displayName,
  photoURL,
  phoneNumber,
}: FirebaseUserLike): FirebaseSessionUser => ({
  uid,
  email,
  emailVerified,
  displayName,
  photoURL,
  phoneNumber,
});
