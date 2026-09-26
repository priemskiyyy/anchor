export const formatClockTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-GB", { hour12: false });
