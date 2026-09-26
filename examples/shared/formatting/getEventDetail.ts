/** One field of a diagnostic event's frozen detail as text, or `null` when the event carries none. */
export const getEventDetail = (context: unknown, field: string) => {
  if (typeof context !== "object" || context === null) {
    return null;
  }

  const fields: [string, unknown][] = Object.entries(context);
  const found = fields.find(([name]) => name === field);

  return found === undefined ? null : String(found[1]);
};
