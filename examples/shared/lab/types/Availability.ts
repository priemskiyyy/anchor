/** Whether a control can run now, and why not when it cannot. */
export type Availability =
  { available: true } | { available: false; reason: string };
