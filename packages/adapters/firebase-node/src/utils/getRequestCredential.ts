import type { FirebaseCredential } from "src/types/internal/FirebaseCredential";
import { getRequestCookie } from "src/utils/getRequestCookie";

export const getRequestCredential = (
  headers: Headers,
  cookie: string,
): FirebaseCredential | null => {
  const idToken = /^Bearer\s+(\S+)\s*$/i.exec(
    headers.get("authorization") ?? "",
  )?.[1];

  if (idToken !== undefined) {
    return { kind: "id-token", value: idToken };
  }

  const sessionCookie = getRequestCookie(headers, cookie);

  if (sessionCookie === null) {
    return null;
  }

  return { kind: "session-cookie", value: sessionCookie };
};
