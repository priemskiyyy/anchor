/** The hydration of a request without a session. */
export const SIGNED_OUT_HYDRATION = Object.freeze({ status: "signed-out" });

/** The hydration of a request whose session could not be told: no error reaches the page. */
export const UNAVAILABLE_HYDRATION = Object.freeze({ status: "unavailable" });
