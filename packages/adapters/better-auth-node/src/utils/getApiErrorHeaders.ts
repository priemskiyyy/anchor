import { API_ERROR_HEADERS } from "src/utils/constants/betterAuth";

export const getApiErrorHeaders = (error: unknown) => {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const headers: unknown = Reflect.get(error, API_ERROR_HEADERS);

  return headers instanceof Headers ? headers : null;
};
