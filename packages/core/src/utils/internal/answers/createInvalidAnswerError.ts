import { AnchorError } from "src/utils/AnchorError";

export const createInvalidAnswerError = (message: string, cause?: unknown) =>
  new AnchorError({ code: "INVALID_ANSWER", message, cause });
