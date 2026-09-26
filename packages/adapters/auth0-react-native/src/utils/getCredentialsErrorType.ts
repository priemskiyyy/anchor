export const getCredentialsErrorType = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "type" in error &&
  typeof error.type === "string"
    ? error.type
    : null;
