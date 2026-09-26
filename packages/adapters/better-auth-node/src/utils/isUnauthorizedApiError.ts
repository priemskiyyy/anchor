import { UNAUTHORIZED_STATUS } from "src/utils/constants/betterAuth";

export const isUnauthorizedApiError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "statusCode" in error &&
  error.statusCode === UNAUTHORIZED_STATUS;
