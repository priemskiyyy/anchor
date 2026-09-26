import type { SessionAction } from "src/types/SessionAction";
import { createInvalidAnswerError } from "src/utils/internal/answers/createInvalidAnswerError";

export const parseSessionAction = (value: unknown): SessionAction => {
  if (typeof value !== "object" || value === null) {
    throw createInvalidAnswerError(
      "The adapter answered a required action without the action.",
    );
  }

  const { kind }: { kind?: unknown } = value;

  if (typeof kind !== "string" || kind.length === 0) {
    throw createInvalidAnswerError(
      "The adapter answered a required action without its kind.",
    );
  }

  return Object.freeze({ kind });
};
