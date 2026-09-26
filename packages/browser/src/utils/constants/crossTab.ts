/** Namespaces every channel, so Anchor's messages never mix with the application's own channels. */
export const CHANNEL_PREFIX = "anchor:";

/** The only message a tab posts: read again. It carries no token, no key and no state. */
export const INVALIDATION_MESSAGE = "invalidate";
