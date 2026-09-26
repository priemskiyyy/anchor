import type { SessionAnswer } from "src/types/SessionAnswer";
import { copyFrozen } from "src/utils/common/copyFrozen";
import { SIGNED_OUT_SESSION_STATE } from "src/utils/constants/states";
import { parseSessionAction } from "src/utils/internal/answers/parseSessionAction";
import { createInvalidAnswerError } from "src/utils/internal/answers/createInvalidAnswerError";
import { parsePrincipal } from "src/utils/internal/answers/parsePrincipal";
import { getInvalidAnswerError } from "src/utils/internal/answers/getInvalidAnswerError";

type SessionFields = {
  context?: unknown;
  guest?: unknown;
  impersonated?: unknown;
};

const parseSessionFields = ({
  context,
  guest,
  impersonated,
}: SessionFields) => {
  if (context !== null && typeof context !== "string") {
    throw createInvalidAnswerError(
      "The adapter answered a context that is neither a string nor null.",
    );
  }

  if (typeof guest !== "boolean" || typeof impersonated !== "boolean") {
    throw createInvalidAnswerError(
      "The adapter answered a session without its guest and impersonated flags.",
    );
  }

  return { context, guest, impersonated };
};

const parseUser = <TUser>(user: TUser) => {
  try {
    return copyFrozen(user);
  } catch (error) {
    throw createInvalidAnswerError(
      "The adapter answered a user that cannot be copied.",
      error,
    );
  }
};

const copyAnswer = <TUser>(
  answer: SessionAnswer<TUser>,
): SessionAnswer<TUser> => {
  if (typeof answer !== "object" || answer === null) {
    throw createInvalidAnswerError("The adapter answered without a session.");
  }

  if (answer.status === "signed-out") {
    return SIGNED_OUT_SESSION_STATE;
  }

  if (answer.status === "signed-in") {
    return Object.freeze({
      status: answer.status,
      principal: parsePrincipal(answer.principal),
      user: parseUser(answer.user),
      ...parseSessionFields(answer),
    });
  }

  if (answer.status === "action-required") {
    return Object.freeze({
      status: answer.status,
      action: parseSessionAction(answer.action),
      principal: parsePrincipal(answer.principal),
      user: parseUser(answer.user),
      ...parseSessionFields(answer),
    });
  }

  throw createInvalidAnswerError(
    "The adapter answered a session status its contract does not allow.",
  );
};

export const parseSessionAnswer = <TUser>(
  answer: SessionAnswer<TUser>,
): SessionAnswer<TUser> => {
  try {
    return copyAnswer(answer);
  } catch (error) {
    throw getInvalidAnswerError(error);
  }
};
