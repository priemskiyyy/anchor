import { AnchorError } from "@priemskiyyy/anchor";

export const formatErrorCode = (error: unknown) =>
  error instanceof AnchorError ? error.code : "an unexpected error";
