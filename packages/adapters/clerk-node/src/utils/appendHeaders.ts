export const appendHeaders = (target: Headers, source: Headers) => {
  for (const [name, value] of source) {
    // A response carries every cookie Clerk set; any other header holds one value.
    if (name === "set-cookie") {
      target.append(name, value);
      continue;
    }

    target.set(name, value);
  }
};
