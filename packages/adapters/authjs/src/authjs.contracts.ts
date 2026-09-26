import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type { Session } from "next-auth";
import * as nextAuth from "next-auth/react";
import { expectTypeOf } from "vitest";

import { authjs } from "src/authjs";
import type { AuthjsClientLike } from "src/types/AuthjsClientLike";
import type { AuthjsSessionOf } from "src/types/AuthjsSessionOf";
import type { AuthjsSessionUser } from "src/types/AuthjsSessionUser";

type Client = typeof nextAuth;

expectTypeOf(nextAuth).toExtend<AuthjsClientLike>();
expectTypeOf<AuthjsSessionOf<Client>>().toEqualTypeOf<Session>();

const adapter = authjs({ sdk: nextAuth });

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<AuthjsSessionUser, Client, never>
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Client>();

const mapped = authjs({
  sdk: nextAuth,
  user: (session) => {
    expectTypeOf(session).toEqualTypeOf<Session>();

    return { name: session.user?.name ?? null, expires: session.expires };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<{ name: string | null; expires: string }, Client, never>
>();

// @ts-expect-error The adapter takes the next-auth/react module, not the session it answers.
export const wrongSdk = authjs({ sdk: nextAuth.getSession() });

// @ts-expect-error Auth.js sessions are cookies, so the adapter declares no token profiles.
export const wrongProfile = authjs({ sdk: nextAuth, tokens: { api: {} } });
