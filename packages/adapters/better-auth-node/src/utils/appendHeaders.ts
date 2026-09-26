export const appendHeaders = (target: Headers, source: Headers | null) => {
  if (source === null) {
    return;
  }

  for (const [name, value] of source) {
    // A response carries every cookie Better Auth set; any other header holds one value.
    if (name === "set-cookie") {
      target.append(name, value);
      continue;
    }

    target.set(name, value);
  }
};
