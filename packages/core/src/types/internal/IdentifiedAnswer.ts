import type { SessionAnswer } from "src/types/SessionAnswer";

export type IdentifiedAnswer<TUser> = Exclude<
  SessionAnswer<TUser>,
  { status: "signed-out" }
>;
