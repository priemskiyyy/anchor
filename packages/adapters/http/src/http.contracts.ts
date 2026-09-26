import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import { expectTypeOf } from "vitest";

import { http } from "src/http";

type User = { id: string; name: string };

declare const getUser: () => Promise<User | null>;

const mint = async () => ({ value: "token", subject: "user_42" });

const adapter = http({
  authority: "https://api.example.com",
  read: async () => {
    const user = await getUser();

    return user === null ? null : { subject: user.id, user };
  },
  tokens: { api: mint, realtime: mint },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<User, null, "api" | "realtime">
>();

const anchor = new Anchor({ adapter });

expectTypeOf(anchor.native).toEqualTypeOf<null>();

const state = anchor.session.get();

if (state.status === "signed-in") {
  expectTypeOf(state.session.user).toEqualTypeOf<User>();
  expectTypeOf(state.session.getToken)
    .parameter(0)
    .toEqualTypeOf<"api" | "realtime">();
}

expectTypeOf(
  http({ authority: "https://api.example.com", read: () => null }),
).toEqualTypeOf<SessionAdapter<unknown, null, never>>();

const inlineMinters = http({
  authority: "https://api.example.com",
  read: () => null,
  tokens: {
    api: async ({ session, signal }) => {
      expectTypeOf(signal).toEqualTypeOf<AbortSignal>();

      return { value: "token", subject: session.principal.subject };
    },
  },
});

expectTypeOf(inlineMinters).toEqualTypeOf<
  SessionAdapter<unknown, null, "api">
>();

// @ts-expect-error The authority names the backend, and is required.
export const withoutAuthority = http({ read: () => null });

export const withoutSubject = http({
  authority: "https://api.example.com",
  // @ts-expect-error A session names its subject.
  read: () => ({ user: { name: "Ada" } }),
});

export const tokenWithoutSubject = http({
  authority: "https://api.example.com",
  read: () => null,
  // @ts-expect-error A token names the subject the server minted it for.
  tokens: { api: async () => ({ value: "token" }) },
});
