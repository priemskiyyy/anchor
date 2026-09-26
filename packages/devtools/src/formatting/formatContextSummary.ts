export const formatContextSummary = (context: unknown) => {
  if (context === null || context === undefined) {
    return "";
  }

  if (typeof context !== "object") {
    return String(context);
  }

  return Object.entries(context)
    .flatMap(([key, value]: [string, unknown]) => {
      if (
        value !== null &&
        (typeof value === "object" || typeof value === "function")
      ) {
        return [];
      }

      return [`${key} ${String(value)}`];
    })
    .join(" · ");
};
