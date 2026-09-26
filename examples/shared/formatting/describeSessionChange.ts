import type { SessionChange } from "example-shared/lab/types/SessionChange";
import type { SessionSummary } from "example-shared/lab/types/SessionSummary";

type SessionChangeDescription = Omit<SessionChange, "id">;

const getLostKeyReason = ({ status }: SessionSummary) => {
  if (status === "unavailable") {
    return "The provider could not be read: no session, and nobody was signed out.";
  }

  if (status === "initializing") {
    return "Harbor is restoring the session: no key yet.";
  }

  return "Signed out: the session and its key are gone.";
};

const getKeptKeyReason = (previous: SessionSummary, next: SessionSummary) => {
  if (previous.name !== next.name) {
    return "The name changed and the key stayed: the same person in the same security context.";
  }

  if (previous.status === next.status) {
    return null;
  }

  return next.status === "action-required"
    ? "The provider blocks the same session on a step: the key stays."
    : "The step is done: the same session keeps its key.";
};

const getNewKeyReason = (previous: SessionSummary, next: SessionSummary) => {
  if (previous.principal?.authority !== next.principal?.authority) {
    return "Another provider vouches for this person, so a new key.";
  }

  if (previous.runtime.id !== next.runtime.id) {
    return "Harbor started again, and a key is never reused: a new key.";
  }

  if (previous.principal?.subject !== next.principal?.subject) {
    return "Another person, so a new key.";
  }

  if (previous.organization !== next.organization) {
    return "Another organization, so a new key.";
  }

  return "The same person in a new security context, so a new key.";
};

/** Why the session key changed between two states, or why it stayed, or `null` when nothing worth saying changed. */
export const describeSessionChange = (
  previous: SessionSummary | null,
  next: SessionSummary,
): SessionChangeDescription | null => {
  if (next.key === null) {
    if (previous === null || previous.key === null) {
      return null;
    }

    return { kind: "no-key", reason: getLostKeyReason(next) };
  }

  if (previous === null || previous.key === null) {
    return { kind: "new-key", reason: "A session began, so a new key." };
  }

  if (previous.key !== next.key) {
    return { kind: "new-key", reason: getNewKeyReason(previous, next) };
  }

  const reason = getKeptKeyReason(previous, next);

  return reason === null ? null : { kind: "same-key", reason };
};
