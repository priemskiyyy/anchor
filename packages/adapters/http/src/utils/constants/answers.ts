/** The answer for no session, on your server's word. */
export const SIGNED_OUT_ANSWER = Object.freeze({ status: "signed-out" });

/** An `end` that resolved: your server ended the session, and nothing is left here. */
export const ENDED_RESULT = Object.freeze({
  local: "completed",
  remote: "completed",
  navigation: null,
});
