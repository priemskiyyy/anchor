export const getRequestCookie = (headers: Headers, name: string) => {
  for (const pair of (headers.get("cookie") ?? "").split(";")) {
    const separator = pair.indexOf("=");

    if (separator === -1 || pair.slice(0, separator).trim() !== name) {
      continue;
    }

    const value = pair.slice(separator + 1).trim();

    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
};
