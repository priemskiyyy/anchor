import type { ReadableValue } from "../types/ReadableValue.js";
import type { RegisteredSessionState } from "../types/Register.js";
import { getInitialSessionState } from "./internal/getInitialSessionState.js";
import { useObservableValue } from "./internal/useObservableValue.svelte.js";
import { useProvidedAnchorValue } from "./internal/useProvidedAnchorValue.js";

const selectState = (state: RegisteredSessionState) => state;

/**
 * Observes the session state, or one selection of it, through `current`,
 * which changes only when the selection changes by `Object.is`. It only
 * observes, and reads `initializing` on the server and until the component is
 * mounted.
 *
 * @example
 * ```ts
 * const state = useSession();
 * const name = useSession((state) => (state.status === "signed-in" ? state.session.user.name : null));
 *
 * const isSignedOut = $derived(state.current.status === "signed-out");
 * ```
 */
export function useSession(): ReadableValue<RegisteredSessionState>;

export function useSession<TSelection>(
  selector: (state: RegisteredSessionState) => TSelection,
): ReadableValue<TSelection>;

// An overload pair resolves the return type from whether a selector is given, as Silo's framework useValue does.
export function useSession(
  selector?: (state: RegisteredSessionState) => unknown,
): ReadableValue<unknown> {
  const anchor = useProvidedAnchorValue();

  return useObservableValue(
    () => anchor.current.session,
    getInitialSessionState(anchor.current.session),
    selector ?? selectState,
  );
}
