import { AnchorError } from "src/utils/AnchorError";
import { createInvalidAnswerError } from "src/utils/internal/answers/createInvalidAnswerError";

export const getInvalidAnswerError = (error: unknown) => {
  if (error instanceof AnchorError) {
    return error;
  }

  return createInvalidAnswerError(
    "The adapter's answer could not be read.",
    error,
  );
};
