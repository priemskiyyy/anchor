import type { OidcUserLike } from "src/types/OidcUserLike";
import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";

type UserLoadedCallback = (user: OidcUserLike) => Promise<void> | void;

type UserCallback = () => Promise<void> | void;

type FakeSignIn = {
  sid?: string | undefined;
  org?: string;
  impersonatedBy?: string;
  tokenType?: string;
};

type FakeUserManagerOptions = {
  endSessionEndpoint?: string | null;
  postLogoutRedirectUri?: string;
  extraQueryParams?: Record<string, string | number | boolean>;
};

export const OIDC_ISSUER = "https://id.example.com/realms/anchor";

export const END_SESSION_ENDPOINT =
  "https://id.example.com/realms/anchor/logout";

const addCallback = <TCallback>(
  callbacks: TCallback[],
  callback: TCallback,
) => {
  callbacks.push(callback);

  return () => {
    const index = callbacks.lastIndexOf(callback);

    if (index < 0) {
      return;
    }

    callbacks.splice(index, 1);
  };
};

// Modelled on oidc-client-ts 3.5.0: every add* call registers its callback and answers the function that removes it, raising an event awaits each callback in turn and rejects with the first that throws, getUser answers a fresh copy of the stored user without raising userLoaded, signinSilent stores the renewed user and raises userLoaded, removeUser raises userUnloaded, and the metadata service answers the end-session endpoint the provider publishes, or undefined.
export const createFakeUserManager = ({
  endSessionEndpoint = END_SESSION_ENDPOINT,
  postLogoutRedirectUri,
  extraQueryParams = {},
}: FakeUserManagerOptions = {}) => {
  const loaded: UserLoadedCallback[] = [];
  const unloaded: UserCallback[] = [];
  const signedOut: UserCallback[] = [];
  const renewals: string[] = [];

  const failures: { renew: unknown; metadata: unknown } = {
    renew: null,
    metadata: null,
  };

  const renewing: { subject: string | null } = { subject: null };
  let issued = 0;
  let sessions = 0;
  let stored: OidcUserLike | null = null;

  const createUser = (
    sub: string,
    { sid, org, impersonatedBy, tokenType = "Bearer" }: FakeSignIn = {},
  ): OidcUserLike => {
    issued += 1;

    return {
      access_token: `access.${sub}.${issued}`,
      token_type: tokenType,
      id_token: `id.${sub}.${issued}`,
      expired: false,
      profile: {
        iss: OIDC_ISSUER,
        sub,
        sid: sid ?? `sid_${sessions}`,
        ...(org === undefined ? {} : { org_id: org }),
        ...(impersonatedBy === undefined
          ? {}
          : { act: { sub: impersonatedBy } }),
        name: sub.toUpperCase(),
        preferred_username: sub,
        email: `${sub}@example.com`,
        email_verified: true,
      },
    };
  };

  const copyUser = (user: OidcUserLike): OidcUserLike => ({
    ...user,
    profile: { ...user.profile },
  });

  const raiseUserLoaded = async (user: OidcUserLike) => {
    for (const callback of loaded) {
      await callback(user);
    }
  };

  const raise = async (callbacks: UserCallback[]) => {
    for (const callback of callbacks) {
      await callback();
    }
  };

  const sdk = {
    events: {
      addUserLoaded: (callback: UserLoadedCallback) =>
        addCallback(loaded, callback),
      addUserUnloaded: (callback: UserCallback) =>
        addCallback(unloaded, callback),
      addUserSignedOut: (callback: UserCallback) =>
        addCallback(signedOut, callback),
    },
    settings: {
      client_id: "anchor-client",
      post_logout_redirect_uri: postLogoutRedirectUri,
      extraQueryParams,
    },
    metadataService: {
      getEndSessionEndpoint: async () => {
        if (failures.metadata !== null) {
          throw failures.metadata;
        }

        return endSessionEndpoint ?? undefined;
      },
    },
    getUser: async () => (stored === null ? null : copyUser(stored)),
    signinSilent: async () => {
      if (failures.renew !== null) {
        throw failures.renew;
      }

      const current = stored;

      if (current === null) {
        throw Object.assign(new Error("login_required"), {
          error: "login_required",
        });
      }

      const subject = renewing.subject ?? current.profile.sub ?? "";

      renewals.push(subject);

      if (subject !== current.profile.sub) {
        sessions += 1;
      }

      stored = createUser(subject, {
        sid: subject === current.profile.sub ? current.profile.sid : undefined,
      });
      await raiseUserLoaded(copyUser(stored));

      return copyUser(stored);
    },
    removeUser: async () => {
      stored = null;
      await raise(unloaded);
    },
  } satisfies OidcUserManagerLike;

  return {
    sdk,
    renewals,
    failures,
    renewing,
    stored: () => stored,
    listeners: () => loaded.length + unloaded.length + signedOut.length,
    signIn: async (sub: string, options: FakeSignIn = {}) => {
      sessions += 1;
      stored = createUser(sub, options);
      await raiseUserLoaded(copyUser(stored));
    },
    signOutAtProvider: () => raise(signedOut),
    switchSilently: (sub: string) => {
      sessions += 1;
      stored = createUser(sub);
    },
    expire: () => {
      if (stored === null) {
        return;
      }

      stored = { ...stored, expired: true };
    },
  };
};
