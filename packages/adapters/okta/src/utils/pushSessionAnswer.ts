import type { SessionAnswer, SessionObserver } from "@priemskiyyy/anchor";

export const pushSessionAnswer = <TUser>(
  observer: SessionObserver<TUser>,
  getAnswer: () => SessionAnswer<TUser>,
) => {
  // okta-auth-js emits inside its auth state update, which turns a subscriber's throw into an error state it emits to every subscriber.
  try {
    observer.session(getAnswer());
  } catch {
    observer.invalidate();
  }
};
