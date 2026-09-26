// Stand-ins for what a reader has and this workspace does not: a package it
// does not install, and the reader's own modules an example imports. A script
// file, not a module, so each block declares a module instead of augmenting
// one, and a pattern matches only what nothing else resolves. Keep them to
// what the documentation uses.
declare module "@clerk/expo" {
  import type { Clerk } from "@clerk/clerk-js";

  // Clerk Expo's instance is clerk-js's own Clerk, loaded headless.
  export const getClerkInstance: (options?: {
    publishableKey?: string;
  }) => Clerk;
}

declare module "@tanstack/react-query" {
  export const useQuery: <TData>(options: {
    queryKey: unknown[];
    queryFn: (context: { signal: AbortSignal }) => Promise<TData>;
  }) => { data: TData | undefined; error: Error | null };
}

// The adapter docs/writing-an-adapter.md builds, for the test that imports it.
declare module "*/acme" {
  import type { SessionAdapter } from "@priemskiyyy/anchor";

  export type AcmeUser = { id: string; name: string };
  export type AcmeAuthLike = {
    currentUser: () => Promise<AcmeUser | null>;
    onChange: (listener: () => void) => () => void;
    getAccessToken: (options: {
      userId: string;
      forceRefresh: boolean;
    }) => Promise<string>;
    signOut: () => Promise<void>;
  };
  export const acme: (options: {
    sdk: AcmeAuthLike;
  }) => SessionAdapter<AcmeUser, AcmeAuthLike, "api">;
}

declare module "*/auth" {
  import type { Auth, BetterAuthOptions } from "better-auth";

  export const auth: Auth<BetterAuthOptions>;
}

declare module "*/config" {
  export const supabaseUrl: string;
  export const supabaseAnonKey: string;
  export const clerkSecretKey: string;
  export const clerkPublishableKey: string;
  export const workosApiKey: string;
  export const workosClientId: string;
  export const workosCookiePassword: string;
}

declare module "*/amplify_outputs.json" {
  import type { ResourcesConfig } from "aws-amplify";

  const outputs: ResourcesConfig;
  export default outputs;
}
