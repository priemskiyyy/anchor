import { getInitialSessionState } from "src/hooks/internal/getInitialSessionState";
import { useObservableValue } from "src/hooks/internal/useObservableValue";
import { useAnchor } from "src/hooks/useAnchor";
import type { RegisteredSessionState } from "src/types/Register";

const selectState = (state: RegisteredSessionState) => state;

/**
 * Observes the session state, or one selection of it: the component renders
 * again only when the selection changes by `Object.is`. It only observes, and
 * reads `initializing` on the server and during hydration.
 *
 * @example
 * ```tsx
 * const state = useSession();
 * const name = useSession((state) => (state.status === "signed-in" ? state.session.user.name : null));
 *
 * if (state.status === "signed-out") return <SignIn />;
 * ```
 */
export function useSession(): RegisteredSessionState;

export function useSession<TSelection>(
  selector: (state: RegisteredSessionState) => TSelection,
): TSelection;

// An overload pair resolves the return type from whether a selector is given, as Silo's framework useValue does.
export function useSession(
  selector?: (state: RegisteredSessionState) => unknown,
): unknown {
  const anchor = useAnchor();

  return useObservableValue(
    anchor.session,
    () => getInitialSessionState(anchor.session),
    selector ?? selectState,
  );
}
