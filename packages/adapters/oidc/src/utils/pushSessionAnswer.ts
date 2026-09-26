import type { SessionAnswer, SessionObserver } from "@priemskiyyy/anchor";

export const pushSessionAnswer = <TUser>(
  observer: SessionObserver<TUser>,
  getAnswer: () => SessionAnswer<TUser>,
) => {
  // oidc-client-ts awaits its event callbacks, so a user mapper that throws here would fail the application's own sign-in.
  try {
    observer.session(getAnswer());
  } catch {
    observer.invalidate();
  }
};
