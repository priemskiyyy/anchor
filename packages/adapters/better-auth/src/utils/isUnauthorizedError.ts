import { UNAUTHORIZED_STATUS } from "src/utils/constants/betterAuth";

export const isUnauthorizedError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "status" in error &&
  error.status === UNAUTHORIZED_STATUS;
