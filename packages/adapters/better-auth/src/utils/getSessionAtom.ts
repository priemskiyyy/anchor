import type { BetterAuthClientLike } from "src/types/BetterAuthClientLike";

export const getSessionAtom = (sdk: BetterAuthClientLike) => {
  const atom = sdk.$store.atoms.session;

  if (atom === undefined) {
    throw new TypeError(
      "The Better Auth client has no session atom: pass the client createAuthClient() returned.",
    );
  }

  return atom;
};
