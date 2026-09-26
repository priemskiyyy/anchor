import { AnchorError } from "@priemskiyyy/anchor";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import { FIREBASE_ISSUER } from "src/utils/constants/firebase";

export const getTokenIssuer = (sdk: FirebaseAuthLike) => {
  const { projectId } = sdk.app.options;

  if (projectId === undefined || projectId === "") {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message:
        "The Firebase app has no projectId, which names the issuer of its ID tokens.",
    });
  }

  return `${FIREBASE_ISSUER}${projectId}`;
};
