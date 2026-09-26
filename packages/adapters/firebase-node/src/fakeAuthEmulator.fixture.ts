import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import type { Agent, IncomingMessage, ServerResponse } from "node:http";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { onTestFinished, vi } from "vitest";

type EmulatorUser = {
  localId: string;
  email?: string;
  displayName?: string;
  disabled: boolean;
  validSince?: string;
};

export const PROJECT_ID = "demo-anchor";

const SESSION_COOKIE_ISSUER = "https://session.firebase.google.com/";

const ID_TOKEN_ISSUER = "https://securetoken.google.com/";

const encodeSegment = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

// A JWT as the Auth Emulator issues it: unsigned, with the claims a Firebase session cookie or ID token carries.
export const mintCredential = (
  issuer: string,
  user: EmulatorUser,
  {
    projectId = PROJECT_ID,
    lifetime = 3600,
    header = { alg: "none", typ: "JWT" },
  }: { projectId?: string; lifetime?: number; header?: object } = {},
) => {
  const now = Math.floor(Date.now() / 1000);

  return [
    encodeSegment(header),
    encodeSegment({
      iss: `${issuer}${projectId}`,
      aud: projectId,
      auth_time: now - 60,
      user_id: user.localId,
      sub: user.localId,
      iat: now - 60,
      exp: now + lifetime,
      ...(user.email === undefined
        ? {}
        : { email: user.email, email_verified: false, name: user.displayName }),
      firebase: {
        identities: user.email === undefined ? {} : { email: [user.email] },
        sign_in_provider: user.email === undefined ? "anonymous" : "password",
      },
    }),
    "",
  ].join(".");
};

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  const body: { localId?: string[]; idToken?: string; email?: string } =
    JSON.parse(Buffer.concat(chunks).toString() || "{}");

  return body;
};

// The subject of a credential the stand-in minted, whose payload it wrote itself.
const getSubject = (credential: string) => {
  const payload: { sub?: string } = JSON.parse(
    Buffer.from(credential.split(".")[1] ?? "", "base64url").toString() || "{}",
  );

  return payload.sub ?? "";
};

// Stands in, on loopback, for the Firebase Auth Emulator: the accounts:lookup firebase-admin 14.4.0 calls for every credential it verifies in emulator mode, answering the user with its disabled flag and the time its sessions are valid since, and the password sign-in and lookup the Firebase JS SDK calls through connectAuthEmulator().
const startEmulator = async () => {
  const users = new Map<string, EmulatorUser>();
  const lookups: string[] = [];
  const failures = { lookup: false };

  const getAccounts = (ids: string[]) =>
    ids.flatMap((id) => {
      const user = users.get(id);

      return user === undefined ? [] : [user];
    });

  const routes: Record<
    string,
    (body: Awaited<ReturnType<typeof readBody>>) => object
  > = {
    [`POST /identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`]:
      ({ localId = [] }) => {
        const found = getAccounts(localId);

        lookups.push(...localId);

        return {
          kind: "identitytoolkit#GetAccountInfoResponse",
          ...(found.length === 0 ? {} : { users: found }),
        };
      },
    "POST /identitytoolkit.googleapis.com/v1/accounts:signInWithPassword": ({
      email,
    }) => {
      const [user] = [...users.values()].flatMap((held) =>
        held.email === email ? [held] : [],
      );

      return {
        kind: "identitytoolkit#VerifyPasswordResponse",
        localId: user?.localId,
        email,
        displayName: user?.displayName,
        idToken:
          user === undefined ? "" : mintCredential(ID_TOKEN_ISSUER, user),
        registered: true,
        refreshToken: `refresh-${user?.localId ?? ""}`,
        expiresIn: "3600",
      };
    },
    "POST /identitytoolkit.googleapis.com/v1/accounts:lookup": ({
      idToken = "",
    }) => ({
      kind: "identitytoolkit#GetAccountInfoResponse",
      users: getAccounts([getSubject(idToken)]).map((user) => ({
        ...user,
        emailVerified: false,
        passwordHash: "UkVEQUNURUQ=",
        providerUserInfo: [
          {
            providerId: "password",
            email: user.email,
            rawId: user.email,
            federatedId: user.email,
            displayName: user.displayName,
          },
        ],
      })),
    }),
  };

  const handleRequest = async (
    request: IncomingMessage,
    response: ServerResponse,
  ) => {
    const body = await readBody(request);
    const { pathname } = new URL(request.url ?? "", "http://127.0.0.1");
    const answer = routes[`${request.method ?? ""} ${pathname}`];

    response.setHeader("content-type", "application/json");

    if (answer === undefined || failures.lookup) {
      response.statusCode = 500;
      response.end(
        JSON.stringify({ error: { code: 500, message: "INTERNAL_ERROR" } }),
      );

      return;
    }

    response.end(JSON.stringify(answer(body)));
  };

  const server = createServer((request, response) => {
    handleRequest(request, response).catch((error: unknown) => {
      response.statusCode = 500;
      response.end(
        JSON.stringify({ error: { code: 500, message: String(error) } }),
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("The emulator stand-in has no port.");
  }

  const updateUser = (uid: string, change: Partial<EmulatorUser>) => {
    const user = users.get(uid);

    if (user === undefined) {
      return;
    }

    users.set(uid, { ...user, ...change });
  };

  return {
    host: `127.0.0.1:${address.port}`,
    lookups,
    failures,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
    signUp: (
      name: string,
      { anonymous = false }: { anonymous?: boolean } = {},
    ) => {
      const user: EmulatorUser = {
        localId: `uid-${name}`,
        disabled: false,
        ...(anonymous
          ? {}
          : { email: `${name}@example.com`, displayName: name.toUpperCase() }),
      };

      users.set(user.localId, user);

      return {
        uid: user.localId,
        sessionCookie: mintCredential(SESSION_COOKIE_ISSUER, user),
        idToken: mintCredential(ID_TOKEN_ISSUER, user),
        mint: (
          kind: "session-cookie" | "id-token",
          options: Parameters<typeof mintCredential>[2],
        ) =>
          mintCredential(
            kind === "session-cookie" ? SESSION_COOKIE_ISSUER : ID_TOKEN_ISSUER,
            user,
            options,
          ),
      };
    },
    revoke: (uid: string) =>
      updateUser(uid, { validSince: String(Math.floor(Date.now() / 1000)) }),
    disable: (uid: string) => updateUser(uid, { disabled: true }),
    remove: (uid: string) => {
      users.delete(uid);
    },
  };
};

// A real firebase-admin Auth, created in emulator mode against the stand-in; the environment variable firebase-admin reads is set only while it is created.
export const createEmulatorAuth = async () => {
  const emulator = await startEmulator();

  const app = initializeApp(
    { projectId: PROJECT_ID },
    `anchor-${randomUUID()}`,
  );

  vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", emulator.host);

  try {
    const auth = getAuth(app);

    onTestFinished(async () => {
      await deleteApp(app);
      await emulator.close();
    });

    return { auth, emulator };
  } finally {
    vi.unstubAllEnvs();
  }
};

// A real firebase-admin Auth outside emulator mode, over the agent it fetches Google's public keys with.
export const createAuth = (httpAgent: Agent) => {
  const app = initializeApp(
    { projectId: PROJECT_ID, httpAgent },
    `anchor-${randomUUID()}`,
  );

  onTestFinished(() => deleteApp(app));

  return getAuth(app);
};
