import type { SessionAnswer, SessionObserver } from "@priemskiyyy/anchor";

export const pushSessionAnswer = <TUser>(
  observer: SessionObserver<TUser>,
  getAnswer: () => SessionAnswer<TUser>,
) => {
  // keycloak-js calls its callbacks inside init() and its token flows, so a user mapper that throws here would fail them.
  try {
    observer.session(getAnswer());
  } catch {
    observer.invalidate();
  }
};
