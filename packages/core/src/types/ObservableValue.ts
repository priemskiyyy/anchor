/**
 * A readable value with change notifications. `subscribe` never calls back at
 * once, and answers its unsubscriber.
 *
 * @example
 * ```ts
 * const stop = anchor.session.subscribe(() => console.log(anchor.session.get().status));
 * ```
 */
export type ObservableValue<TValue> = {
  get: () => TValue;
  subscribe: (listener: () => void) => () => void;
};
