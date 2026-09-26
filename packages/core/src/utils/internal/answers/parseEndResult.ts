import type { EndResult } from "src/types/EndResult";
import type { EndStep } from "src/types/EndStep";
import { createInvalidAnswerError } from "src/utils/internal/answers/createInvalidAnswerError";
import { getInvalidAnswerError } from "src/utils/internal/answers/getInvalidAnswerError";

const END_STEPS = Object.freeze({
  completed: true,
  "not-applicable": true,
  unknown: true,
} satisfies Record<EndStep, true>);

const isEndStep = (value: unknown): value is EndStep =>
  typeof value === "string" && Object.hasOwn(END_STEPS, value);

const parseNavigation = (navigation: unknown) => {
  if (navigation === null) {
    return null;
  }

  if (typeof navigation !== "object") {
    throw createInvalidAnswerError(
      "The adapter answered a navigation that is neither a page nor null.",
    );
  }

  const { url }: { url?: unknown } = navigation;

  if (typeof url !== "string" || url.length === 0) {
    throw createInvalidAnswerError(
      "The adapter answered a navigation without its url.",
    );
  }

  return Object.freeze({ url });
};

const copyEndResult = (result: EndResult): EndResult => {
  if (typeof result !== "object" || result === null) {
    throw createInvalidAnswerError(
      "The adapter answered an ending without a result.",
    );
  }

  const {
    local,
    remote,
    navigation,
  }: { local?: unknown; remote?: unknown; navigation?: unknown } = result;

  if (!isEndStep(local) || !isEndStep(remote)) {
    throw createInvalidAnswerError(
      "The adapter answered an ending step its contract does not allow.",
    );
  }

  return Object.freeze({
    local,
    remote,
    navigation: parseNavigation(navigation),
  });
};

export const parseEndResult = (result: EndResult): EndResult => {
  try {
    return copyEndResult(result);
  } catch (error) {
    throw getInvalidAnswerError(error);
  }
};
