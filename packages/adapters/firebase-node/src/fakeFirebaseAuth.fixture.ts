import { FirebaseAuthError } from "firebase-admin/auth";
import type { DecodedIdToken } from "firebase-admin/auth";

import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";

type CredentialKind = "session-cookie" | "id-token";

type FakeUser = {
  uid: string;
  provider: string;
  tenant: string | null;
  disabled: boolean;
  deleted: boolean;
  revoked: boolean;
};

type FakeCredential = { kind: CredentialKind; uid: string; expired: boolean };

export const PROJECT_ID = "anchor-project";

const WORDS = Object.freeze({
  "session-cookie": {
    name: "Firebase session cookie",
    shortName: "session cookie",
    article: "a",
    url: "https://firebase.google.com/docs/auth/admin/manage-cookies",
    expired: "session-cookie-expired",
    revoked: "session-cookie-revoked",
  },
  "id-token": {
    name: "Firebase ID token",
    shortName: "ID token",
    article: "an",
    url: "https://firebase.google.com/docs/auth/admin/verify-id-tokens",
    expired: "id-token-expired",
    revoked: "id-token-revoked",
  },
});

const createRefusal = (
  kind: CredentialKind,
  reason: "decoding" | "expired",
) => {
  const words = WORDS[kind];
  const docs = ` See ${words.url} for details on how to retrieve ${words.article} ${words.shortName}.`;

  if (reason === "expired") {
    return new FirebaseAuthError(
      { code: words.expired, message: "" },
      `${words.name} has expired. Get a fresh ${words.shortName} from your client app and try again (auth/${words.expired}).${docs}`,
    );
  }

  return new FirebaseAuthError(
    { code: "argument-error", message: "" },
    `Decoding ${words.name} failed. Make sure you passed the entire string JWT which represents ${words.article} ${words.shortName}.${docs}`,
  );
};

// Modelled on firebase-admin 14.4.0's Auth: verifySessionCookie() and verifyIdToken() answer the claims of a credential they accept, refuse one they cannot decode with auth/argument-error in words that name the credential and an expired one with its own expired code, and only with checkRevoked refuse a disabled user with auth/user-disabled, a deleted one with auth/user-not-found and a revoked session with its own revoked code.
export const createFakeFirebaseAuth = () => {
  const users = new Map<string, FakeUser>();
  const credentials = new Map<string, FakeCredential>();

  const calls: [method: string, credential: string, checkRevoked: boolean][] =
    [];

  const failures: { verify: unknown } = { verify: null };

  const getClaims = (user: FakeUser): DecodedIdToken => ({
    aud: PROJECT_ID,
    iss: `https://session.firebase.google.com/${PROJECT_ID}`,
    sub: user.uid,
    uid: user.uid,
    iat: 1_790_000_000,
    exp: 1_790_003_600,
    auth_time: 1_790_000_000,
    ...(user.provider === "anonymous"
      ? {}
      : {
          email: `${user.uid}@example.com`,
          email_verified: true,
          name: user.uid.toUpperCase(),
          picture: `https://example.com/${user.uid}.png`,
        }),
    firebase: {
      identities: {},
      sign_in_provider: user.provider,
      ...(user.tenant === null ? {} : { tenant: user.tenant }),
    },
  });

  const verify = async (
    kind: CredentialKind,
    value: string,
    checkRevoked: boolean,
  ) => {
    if (failures.verify !== null) {
      throw failures.verify;
    }

    const credential = credentials.get(value);
    const user = users.get(credential?.uid ?? "");

    if (
      credential === undefined ||
      credential.kind !== kind ||
      user === undefined
    ) {
      throw createRefusal(kind, "decoding");
    }

    if (credential.expired) {
      throw createRefusal(kind, "expired");
    }

    if (checkRevoked && user.deleted) {
      throw new FirebaseAuthError({
        code: "user-not-found",
        message:
          "There is no user record corresponding to the provided identifier.",
      });
    }

    if (checkRevoked && user.disabled) {
      throw new FirebaseAuthError({
        code: "user-disabled",
        message: "The user record is disabled.",
      });
    }

    if (checkRevoked && user.revoked) {
      throw new FirebaseAuthError({
        code: WORDS[kind].revoked,
        message: `The Firebase ${WORDS[kind].shortName} has been revoked.`,
      });
    }

    return getClaims(user);
  };

  const sdk = {
    verifySessionCookie: (sessionCookie: string, checkRevoked = false) => {
      calls.push(["verifySessionCookie", sessionCookie, checkRevoked]);

      return verify("session-cookie", sessionCookie, checkRevoked);
    },
    verifyIdToken: (idToken: string, checkRevoked = false) => {
      calls.push(["verifyIdToken", idToken, checkRevoked]);

      return verify("id-token", idToken, checkRevoked);
    },
  } satisfies FirebaseAuthLike;

  const updateUser = (uid: string, change: Partial<FakeUser>) => {
    const user = users.get(uid);

    if (user === undefined) {
      return;
    }

    users.set(uid, { ...user, ...change });
  };

  return {
    sdk,
    calls,
    failures,
    signIn: (
      uid: string,
      {
        provider = "password",
        tenant = null,
      }: { provider?: string; tenant?: string | null } = {},
    ) => {
      users.set(uid, {
        uid,
        provider,
        tenant,
        disabled: false,
        deleted: false,
        revoked: false,
      });
      credentials.set(`cookie_${uid}`, {
        kind: "session-cookie",
        uid,
        expired: false,
      });
      credentials.set(`token_${uid}`, {
        kind: "id-token",
        uid,
        expired: false,
      });

      return { sessionCookie: `cookie_${uid}`, idToken: `token_${uid}` };
    },
    expire: (value: string) => {
      const credential = credentials.get(value);

      if (credential === undefined) {
        return;
      }

      credentials.set(value, { ...credential, expired: true });
    },
    revoke: (uid: string) => updateUser(uid, { revoked: true }),
    disable: (uid: string) => updateUser(uid, { disabled: true }),
    remove: (uid: string) => updateUser(uid, { deleted: true }),
  };
};

export const requestWith = ({
  cookie,
  authorization,
}: {
  cookie?: string;
  authorization?: string;
}) =>
  new Request("https://app.example.com/", {
    headers: {
      ...(cookie === undefined ? {} : { cookie }),
      ...(authorization === undefined ? {} : { authorization }),
    },
  });
