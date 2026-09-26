import type { AmplifyJwtLike } from "src/types/AmplifyJwtLike";

export const getSessionContext = ({ origin_jti }: AmplifyJwtLike["payload"]) =>
  typeof origin_jti === "string" ? origin_jti : null;
