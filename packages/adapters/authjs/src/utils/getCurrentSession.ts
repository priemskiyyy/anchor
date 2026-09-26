import type { AuthjsSessionLike } from "src/types/AuthjsSessionLike";

// next-auth's getSession() answers null for a request that failed as well, so the session is read from the endpoint it calls, which tells the two apart.
export const getCurrentSession = async (
  basePath: string,
): Promise<AuthjsSessionLike | null> => {
  const response = await fetch(`${basePath}/session`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Auth.js answered ${response.status} for the session.`);
  }

  const session: AuthjsSessionLike | Record<string, never> | null =
    await response.json();

  // Auth.js 4 answers an empty object for no session, and Auth.js 5 null.
  if (session === null || !("user" in session)) {
    return null;
  }

  return session;
};
