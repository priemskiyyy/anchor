/** Which credential carried Harbor's request for the projects on screen. */
export const describeCredential = (credential: "token" | "cookie") =>
  credential === "cookie"
    ? "Loaded with the session cookie: this provider mints no tokens."
    : "Loaded with a token minted for this session.";
