import { Anchor } from "@priemskiyyy/anchor";
import type { SessionState } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import { expectTypeOf } from "vitest";
import type { ComputedRef } from "vue";

import { useAnchor } from "src/composables/useAnchor";
import { useSession } from "src/composables/useSession";
import type { AnchorProviderProps } from "src/context/AnchorProvider";
import type {
  RegisteredAnchor,
  RegisteredSession,
  RegisteredSessionState,
  RegisteredTokenProfile,
  RegisteredUser,
} from "src/types/Register";

const untyped = new Anchor({
  adapter: createMockAdapter<unknown, string>({ tokens: { api: {} } }).adapter,
});

const typed = new Anchor({
  adapter: createMockAdapter<{ name: string }, "api">({ tokens: { api: {} } })
    .adapter,
});

expectTypeOf(untyped).toExtend<AnchorProviderProps["anchor"]>();

// @ts-expect-error Unregistered, the provider refuses an Anchor typed by its own adapter.
export const unregistered: AnchorProviderProps["anchor"] = typed;

// @ts-expect-error The provider publishes an Anchor.
export const withoutAnchor: AnchorProviderProps = {};

expectTypeOf<RegisteredUser>().toEqualTypeOf<unknown>();
expectTypeOf<RegisteredTokenProfile>().toEqualTypeOf<string>();
expectTypeOf<RegisteredAnchor>().toEqualTypeOf<
  Anchor<unknown, unknown, string>
>();
expectTypeOf<RegisteredSessionState>().toEqualTypeOf<
  SessionState<unknown, string>
>();

export const useTypeContracts = () => {
  expectTypeOf(useAnchor()).toEqualTypeOf<RegisteredAnchor>();
  expectTypeOf(useSession()).toEqualTypeOf<
    ComputedRef<RegisteredSessionState>
  >();
  expectTypeOf(useSession((state) => state.status)).toEqualTypeOf<
    ComputedRef<RegisteredSessionState["status"]>
  >();
  expectTypeOf(
    useSession((state) =>
      state.status === "signed-in" ? state.session : null,
    ),
  ).toEqualTypeOf<ComputedRef<RegisteredSession | null>>();

  // @ts-expect-error A selector reads the session state.
  useSession((state: number) => state);

  const session = useSession();

  // @ts-expect-error The session state is read, never written.
  session.value = { status: "signed-out" };
};
