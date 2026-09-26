const VISIBLE_LENGTH = 8;

export const formatSessionKey = (session: { key: string } | null) => {
  if (session === null) {
    return "";
  }

  return session.key.slice(0, VISIBLE_LENGTH);
};
