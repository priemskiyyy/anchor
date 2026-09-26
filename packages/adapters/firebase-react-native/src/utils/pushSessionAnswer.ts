import type { SessionAnswer, SessionObserver } from "@priemskiyyy/anchor";

export const pushSessionAnswer = <TUser>(
  observer: SessionObserver<TUser>,
  getAnswer: () => SessionAnswer<TUser>,
) => {
  // React Native's EventEmitter calls its listeners in one loop without a catch, so a throw here would keep the change from the application's own listeners.
  try {
    observer.session(getAnswer());
  } catch {
    observer.invalidate();
  }
};
