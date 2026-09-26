import type { Token } from "src/types/Token";
import { createInvalidAnswerError } from "src/utils/internal/answers/createInvalidAnswerError";
import { getInvalidAnswerError } from "src/utils/internal/answers/getInvalidAnswerError";

const copyToken = (token: Token): Token => {
  if (typeof token !== "object" || token === null) {
    throw createInvalidAnswerError(
      "The adapter answered a token request without a token.",
    );
  }

  const {
    value,
    kind,
    scheme,
  }: { value?: unknown; kind?: unknown; scheme?: unknown } = token;

  if (typeof value !== "string" || value.length === 0) {
    throw createInvalidAnswerError(
      "The adapter answered a token without its value.",
    );
  }

  if (typeof kind !== "string" || kind.length === 0) {
    throw createInvalidAnswerError(
      "The adapter answered a token without its kind.",
    );
  }

  if (scheme !== null && (typeof scheme !== "string" || scheme.length === 0)) {
    throw createInvalidAnswerError(
      "The adapter answered a token scheme that is neither a name nor null.",
    );
  }

  return Object.freeze({ value, kind, scheme });
};

export const parseToken = (token: Token): Token => {
  try {
    return copyToken(token);
  } catch (error) {
    throw getInvalidAnswerError(error);
  }
};
