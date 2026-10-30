import type { BetterAuthSessionAtomLike } from "src/types/BetterAuthSessionAtomLike";
import type { BetterAuthSessionLike } from "src/types/BetterAuthSessionLike";
import { isAnsweredSessionState } from "src/utils/isAnsweredSessionState";

// A held session whose fetch is in flight is answered unconfirmed once `confirmationTimeout` has passed, unless the fetch settled first; with no timeout it waits for the server. Only a settled fetch ever answers no session.
export const subscribeToSessionAnswers = (
  atom: BetterAuthSessionAtomLike,
  confirmationTimeout: number | null,
  handleAnswer: (data: BetterAuthSessionLike | null) => void,
) => {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearConfirmationTimer = () => {
    if (timer === null) {
      return;
    }

    clearTimeout(timer);
    timer = null;
  };

  const handleUnconfirmed = () => {
    timer = null;

    const { data } = atom.get();

    if (data === null) {
      return;
    }

    handleAnswer(data);
  };

  const unsubscribe = atom.subscribe((value) => {
    if (isAnsweredSessionState(value)) {
      clearConfirmationTimer();
      handleAnswer(value.data);

      return;
    }

    if (confirmationTimeout === null || value.data === null || timer !== null) {
      return;
    }

    timer = setTimeout(handleUnconfirmed, confirmationTimeout);
  });

  return () => {
    clearConfirmationTimer();
    unsubscribe();
  };
};
