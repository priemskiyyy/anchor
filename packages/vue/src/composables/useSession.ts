import type { ComputedRef } from "vue";

import { getInitialSessionState } from "src/composables/internal/getInitialSessionState";
import { useObservableValue } from "src/composables/internal/useObservableValue";
import { useProvidedAnchorRef } from "src/composables/internal/useProvidedAnchorRef";
import type { RegisteredSessionState } from "src/types/Register";

const selectState = (state: RegisteredSessionState) => state;

/**
 * Observes the session state, or one selection of it, as a read-only computed
 * ref that changes only when the selection changes by `Object.is`. It only
 * observes, and reads `initializing` on the server and until the component is
 * mounted.
 *
 * @example
 * ```ts
 * const state = useSession();
 * const name = useSession((state) => (state.status === "signed-in" ? state.session.user.name : null));
 *
 * const isSignedOut = computed(() => state.value.status === "signed-out");
 * ```
 */
export function useSession(): ComputedRef<RegisteredSessionState>;

export function useSession<TSelection>(
  selector: (state: RegisteredSessionState) => TSelection,
): ComputedRef<TSelection>;

// An overload pair resolves the return type from whether a selector is given, as Silo's framework useValue does.
export function useSession(
  selector?: (state: RegisteredSessionState) => unknown,
): ComputedRef<unknown> {
  const anchor = useProvidedAnchorRef();

  return useObservableValue(
    () => anchor.value.session,
    getInitialSessionState(anchor.value.session),
    selector ?? selectState,
  );
}
