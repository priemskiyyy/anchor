const decodeCookieValue = (value: string) => {
  if (!value.includes("%")) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

// As the cookie package parses a Cookie header for @supabase/ssr's parseCookieHeader: the first of two cookies with one name wins.
export const getRequestCookies = (headers: Headers) => {
  const names = new Set<string>();

  return (headers.get("cookie") ?? "").split(";").flatMap((pair) => {
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator).trim();

    if (separator === -1 || names.has(name)) {
      return [];
    }

    names.add(name);

    return [
      { name, value: decodeCookieValue(pair.slice(separator + 1).trim()) },
    ];
  });
};
