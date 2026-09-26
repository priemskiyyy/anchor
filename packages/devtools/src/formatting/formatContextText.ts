export const formatContextText = (context: unknown) => {
  try {
    return JSON.stringify(context, null, 2) ?? "undefined";
  } catch {
    return "[Unable to show this value]";
  }
};
