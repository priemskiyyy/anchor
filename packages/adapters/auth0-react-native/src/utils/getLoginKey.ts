export const getLoginKey = (subject: string, context: string | null) =>
  JSON.stringify([subject, context]);
