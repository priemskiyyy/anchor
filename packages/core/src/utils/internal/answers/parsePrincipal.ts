import type { Principal } from "src/types/Principal";
import { createInvalidAnswerError } from "src/utils/internal/answers/createInvalidAnswerError";

export const parsePrincipal = (value: unknown): Principal => {
  if (typeof value !== "object" || value === null) {
    throw createInvalidAnswerError(
      "The adapter answered a session without a principal.",
    );
  }

  const {
    authority,
    subject,
    tenant,
  }: { authority?: unknown; subject?: unknown; tenant?: unknown } = value;

  if (typeof authority !== "string" || authority.length === 0) {
    throw createInvalidAnswerError(
      "The adapter answered a principal without an authority.",
    );
  }

  if (typeof subject !== "string" || subject.length === 0) {
    throw createInvalidAnswerError(
      "The adapter answered a principal without a subject.",
    );
  }

  if (tenant !== null && (typeof tenant !== "string" || tenant.length === 0)) {
    throw createInvalidAnswerError(
      "The adapter answered a tenant that is neither a name nor null.",
    );
  }

  return Object.freeze({ authority, subject, tenant });
};
