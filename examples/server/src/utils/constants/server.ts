/** The port the example listens on. */
export const SERVER_PORT = 4320;

/** Where the example serves, which Better Auth takes as its base URL. */
export const SERVER_ORIGIN = `http://127.0.0.1:${SERVER_PORT}`;

/** A made-up signing secret for this in-memory demo; a real server reads its own from a secret store. */
export const AUTH_SECRET = "session-lab-example-secret-for-a-memory-database";

/** The longest request body the server reads, in bytes. */
export const MAXIMUM_BODY_SIZE = 16_384;

/** The longest visitor name the sign-up form keeps. */
export const MAXIMUM_NAME_LENGTH = 40;
