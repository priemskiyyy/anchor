import { SESSION_COOKIE_ATTRIBUTES } from "src/utils/constants/workos";

export const getSessionCookieHeader = (
  cookie: string,
  sealedSession: string | null,
) =>
  sealedSession === null
    ? `${cookie}=; Max-Age=0; ${SESSION_COOKIE_ATTRIBUTES}`
    : `${cookie}=${sealedSession}; ${SESSION_COOKIE_ATTRIBUTES}`;
