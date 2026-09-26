/** The session state until the first resolution, interned so observers compare states by identity. */
export const INITIALIZING_SESSION_STATE = Object.freeze({
  status: "initializing",
});

/** The session state with no session, interned so observers compare states by identity. */
export const SIGNED_OUT_SESSION_STATE = Object.freeze({
  status: "signed-out",
});
