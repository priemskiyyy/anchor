// Names a documentation example may use without declaring them. They stand
// for the reader's own application and for the provider SDKs the reader
// installs and initializes.
import type {
  Anchor,
  AnchorSession,
  SessionAdapter,
} from "@priemskiyyy/anchor";
import type { FirebaseSessionUser } from "@priemskiyyy/anchor-firebase";
import type {
  RequestSessionState,
  ServerSessionAdapter,
  SessionHydration,
} from "@priemskiyyy/anchor-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthOptions } from "next-auth";
import type { FirebaseApp, FirebaseOptions } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { ReactNode } from "react";
import type { ZodType } from "zod";

type FakeServer = { origin: string };

declare global {
  const firebaseConfig: FirebaseOptions;
  /** The application's Firebase app, from `initializeApp(firebaseConfig)`. */
  const app: FirebaseApp;
  /** The application's Firebase Auth, from `getAuth(app)`. */
  const auth: Auth;
  /** The application's Anchor over Firebase with one `api` profile: the one every binding registers. */
  const anchor: Anchor<FirebaseSessionUser, Auth, "api">;
  const adapter: SessionAdapter<FirebaseSessionUser, Auth, "api">;
  /** A signed-in session of that Anchor. */
  const session: AnchorSession<FirebaseSessionUser, "api">;
  const supabaseClient: SupabaseClient;
  const SUPABASE_URL: string;
  const SUPABASE_ANON_KEY: string;
  const email: string;
  const password: string;
  const username: string;
  const domain: string;
  const clientId: string;
  const authority: string;
  const publishableKey: string;
  /** The Auth.js providers the application configures. */
  const providers: AuthOptions["providers"];
  const Application: () => ReactNode;
  const showSignedOutBanner: () => void;
  const showSignInAgainPrompt: () => void;
  /** The application's own validation of its session endpoint's answer. */
  const SessionSchema: ZodType<{
    user: { id: string; name: string };
    session: { id: string };
  }>;
  const TokenSchema: ZodType<{ token: string; userId: string }>;
  /** The application's own API client. */
  const api: {
    get: (path: string, options: { signal: AbortSignal }) => Promise<unknown>;
  };
  const renderPage: (
    state: RequestSessionState<unknown>,
    hydration?: SessionHydration<unknown>,
  ) => string;
  /** A fake or in-process provider server a server adapter's tests run against. */
  const server: FakeServer;
  const myProvider: (options: {
    sdk: FakeServer;
  }) => ServerSessionAdapter<{ id: string }, FakeServer>;
  const signInAndGetCookie: (
    server: FakeServer,
    name: string,
  ) => Promise<Headers>;
  const endSessionOf: (server: FakeServer, headers: Headers) => Promise<void>;
}

// verify-snippets.mjs appends the Register merges below this file's content:
// declaration merging needs an interface, which ESLint bans outside a
// binding's own Register.ts, so the generated copy carries them instead.
