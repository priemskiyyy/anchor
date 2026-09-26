import type { Accessor } from "solid-js";

import { getInitialSessionState } from "src/primitives/internal/getInitialSessionState";
import { useObservableValue } from "src/primitives/internal/useObservableValue";
import { useProvidedAnchorAccessor } from "src/primitives/internal/useProvidedAnchorAccessor";
import type { RegisteredSessionState } from "src/types/Register";

const selectState = (state: RegisteredSessionState) => state;

/**
 * Observes the session state, or one selection of it, as an accessor that
 * changes only when the selection changes by `Object.is`. It only observes,
 * and reads `initializing` on the server and until the component is mounted.
 *
 * @example
 * ```tsx
 * const state = useSession();
 * const name = useSession((state) => (state.status === "signed-in" ? state.session.user.name : null));
 *
 * <Show when={state().status === "signed-out"}><SignIn /></Show>;
 * ```
 */
export function useSession(): Accessor<RegisteredSessionState>;

export function useSession<TSelection>(
  selector: (state: RegisteredSessionState) => TSelection,
): Accessor<TSelection>;

// An overload pair resolves the return type from whether a selector is given, as Silo's framework useValue does.
export function useSession(
  selector?: (state: RegisteredSessionState) => unknown,
): Accessor<unknown> {
  const anchor = useProvidedAnchorAccessor();

  return useObservableValue(
    () => anchor().session,
    getInitialSessionState(anchor().session),
    selector ?? selectState,
  );
}
