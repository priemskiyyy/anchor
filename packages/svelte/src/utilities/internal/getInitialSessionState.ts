import type { ObservableValue } from "@priemskiyyy/anchor";

import type { RegisteredSessionState } from "../../types/Register.js";

// Interned for a server render whose Anchor has already left initializing.
const INITIALIZING_SESSION_STATE = Object.freeze({
  status: "initializing",
}) satisfies RegisteredSessionState;

// The Anchor's own initializing state while it has one, so the server render, hydration and the mounted read share one reference.
export const getInitialSessionState = (
  session: ObservableValue<RegisteredSessionState>,
): RegisteredSessionState => {
  const state = session.get();

  return state.status === "initializing" ? state : INITIALIZING_SESSION_STATE;
};
