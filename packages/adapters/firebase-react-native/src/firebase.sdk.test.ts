import { Anchor } from "@priemskiyyy/anchor";
import type { AnchorSession, SessionState } from "@priemskiyyy/anchor";
import { initializeApp } from "@react-native-firebase/app";
import { getApp as getNativeApp } from "@react-native-firebase/app/dist/module/internal/web/firebaseApp";
import {
  initializeAuth as initializeNativeAuth,
  signInAnonymously as signInNativelyAnonymously,
  signInWithCustomToken as signInNativelyWithCustomToken,
  signOut as signOutNatively,
} from "@react-native-firebase/app/dist/module/internal/web/firebaseAuth";
import { getAuth, signInAnonymously } from "@react-native-firebase/auth";
import { afterAll, expect, test, vi } from "vitest";

import { firebase } from "src/firebase";
import { idToken } from "src/idToken";

const reactNative = vi.hoisted(() => {
  type Listener = (...args: unknown[]) => unknown;

  type Registration = {
    listener: Listener;
    context: unknown;
    remove: () => void;
  };

  class EventEmitter {
    #registry = new Map<string, Set<Registration>>();

    addListener = (
      eventType: string,
      listener: Listener,
      context?: unknown,
    ) => {
      const registrations =
        this.#registry.get(eventType) ?? new Set<Registration>();

      const registration: Registration = {
        listener,
        context,
        remove: () => {
          registrations.delete(registration);
        },
      };

      registrations.add(registration);
      this.#registry.set(eventType, registrations);

      return registration;
    };

    emit = (eventType: string, ...args: unknown[]) => {
      for (const registration of [...(this.#registry.get(eventType) ?? [])]) {
        registration.listener.apply(registration.context, args);
      }
    };

    removeAllListeners = (eventType: string) => {
      this.#registry.delete(eventType);
    };

    listenerCount = (eventType: string) =>
      this.#registry.get(eventType)?.size ?? 0;
  }

  const DeviceEventEmitter = new EventEmitter();

  // React Native Firebase subclasses this and calls super.addListener, so its members live on the prototype.
  class NativeEventEmitter {
    addListener(eventType: string, listener: Listener, context?: unknown) {
      return DeviceEventEmitter.addListener(eventType, listener, context);
    }

    removeAllListeners(eventType: string) {
      DeviceEventEmitter.removeAllListeners(eventType);
    }
  }

  return { EventEmitter, DeviceEventEmitter, NativeEventEmitter };
});

// Firebase's endpoints are answered in-process; the Firebase JS SDK takes fetch as it loads, so this runs before the imports.
const endpoints = vi.hoisted(() => {
  const encodeSegment = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  const issued: { uid: string; idToken: string }[] = [];
  const requests: string[] = [];
  const accounts = { created: 0 };

  const issueIdToken = (uid: string) => {
    const issuedAt = Math.floor(Date.now() / 1000);

    const token = [
      encodeSegment({ alg: "RS256", kid: "anchor" }),
      encodeSegment({
        iss: "https://securetoken.google.com/anchor-demo",
        aud: "anchor-demo",
        auth_time: issuedAt,
        user_id: uid,
        sub: uid,
        iat: issuedAt,
        exp: issuedAt + 3600,
        jti: `id-${issued.length + 1}`,
        firebase: { identities: {}, sign_in_provider: "anonymous" },
      }),
      "signature",
    ].join(".");

    issued.push({ uid, idToken: token });

    return token;
  };

  const answer = async (input: RequestInfo | URL, init?: RequestInit) => {
    const { pathname } = new URL(String(input));
    const body = String(init?.body ?? "");

    if (pathname.endsWith("accounts:signUp")) {
      accounts.created += 1;

      const uid = `uid-${accounts.created}`;

      requests.push(`signUp ${uid}`);

      return Response.json({
        kind: "identitytoolkit#SignupNewUserResponse",
        idToken: issueIdToken(uid),
        refreshToken: `refresh.${uid}`,
        expiresIn: "3600",
        localId: uid,
      });
    }

    if (pathname.endsWith("accounts:signInWithCustomToken")) {
      const uid = /"token":"([^"]+)"/.exec(body)?.[1] ?? "";

      requests.push(`signInWithCustomToken ${uid}`);

      return Response.json({
        kind: "identitytoolkit#VerifyCustomTokenResponse",
        idToken: issueIdToken(uid),
        refreshToken: `refresh.${uid}`,
        expiresIn: "3600",
        isNewUser: false,
      });
    }

    if (pathname.endsWith("accounts:lookup")) {
      const uid =
        issued.find((entry) => body.includes(entry.idToken))?.uid ?? "";

      requests.push(`lookup ${uid}`);

      return Response.json({
        users: [
          {
            localId: uid,
            lastLoginAt: "1700000000000",
            createdAt: "1700000000000",
          },
        ],
      });
    }

    const grant = new URLSearchParams(body);
    const refreshToken = grant.get("refresh_token") ?? "";
    const uid = refreshToken.replace("refresh.", "");
    const token = issueIdToken(uid);

    requests.push(`token ${grant.get("grant_type")} ${uid}`);

    return Response.json({
      access_token: token,
      expires_in: "3600",
      token_type: "Bearer",
      refresh_token: refreshToken,
      id_token: token,
      user_id: uid,
      project_id: "anchor-demo",
    });
  };

  vi.stubGlobal("fetch", answer);

  return { issued, requests };
});

// Only React Native's own modules, which are Flow source, are replaced; React Native Firebase runs the module it registers for platforms without the native SDKs.
vi.mock("react-native", () => ({
  Platform: { OS: "web" },
  DeviceEventEmitter: reactNative.DeviceEventEmitter,
  NativeEventEmitter: reactNative.NativeEventEmitter,
}));

vi.mock("react-native/Libraries/vendor/emitter/EventEmitter", () => ({
  default: reactNative.EventEmitter,
}));

vi.mock("react-native/Libraries/Utilities/binaryToBase64", () => ({
  default: () => "",
}));

afterAll(() => {
  vi.unstubAllGlobals();
});

const AUTHORITY = "https://securetoken.google.com/anchor-demo";

const initializeFirebaseApp = (name: string) =>
  initializeApp(
    {
      apiKey: "anchor-demo-key",
      appId: "1:1234:web:anchor",
      databaseURL: "https://anchor-demo.firebaseio.com",
      messagingSenderId: "1234",
      projectId: "anchor-demo",
      storageBucket: "anchor-demo.appspot.com",
    },
    name,
  );

// The Firebase JS SDK behind that module stands in for the native SDK, so a test can change the native user before React Native Firebase's JavaScript hears of it.
const getNativeAuth = (name: string) =>
  initializeNativeAuth(getNativeApp(name), {});

const identify = (subject: string) => ({
  principal: { authority: AUTHORITY, subject, tenant: null },
  context: null,
});

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(`Expected a session, got ${state.status}.`);
  }

  return state.session;
};

test("the real React Native Firebase Auth is initializing until its native module reports the user it restored, never signed out", async () => {
  const app = await initializeFirebaseApp("anchor-restore");

  const { user: restored } = await signInNativelyAnonymously(
    getNativeAuth("anchor-restore"),
  );

  const auth = getAuth(app);

  expect(auth.currentUser).toBe(null);

  const anchor = new Anchor({
    adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
  });

  const statuses: string[] = [];

  anchor.session.subscribe(() => statuses.push(anchor.session.get().status));
  await anchor.start();

  expect(statuses).toEqual(["signed-in"]);
  expect(getSignedInSession(anchor.session.get()).principal).toEqual({
    authority: AUTHORITY,
    subject: restored.uid,
    tenant: null,
  });

  anchor.dispose();
});

test("a sign-in through the real modular API is pushed, mints its ID token and a forced one through the refresh grant, and ending signs it out", async () => {
  const auth = getAuth(await initializeFirebaseApp("anchor-sign-in"));

  const anchor = new Anchor({
    adapter: firebase({ sdk: auth, tokens: { api: idToken() } }),
  });

  await anchor.start();

  expect(anchor.native).toBe(auth);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  const { user } = await signInAnonymously(auth);

  await expect.poll(() => anchor.session.get().status).toBe("signed-in");

  const session = getSignedInSession(anchor.session.get());

  expect(session.principal).toEqual({
    authority: AUTHORITY,
    subject: user.uid,
    tenant: null,
  });
  expect(session.guest).toBe(true);
  expect(session.user).toEqual({
    uid: user.uid,
    email: null,
    emailVerified: false,
    displayName: null,
    photoURL: null,
    phoneNumber: null,
  });

  const [signUp] = endpoints.issued.filter(({ uid }) => uid === user.uid);

  await expect(session.getToken("api")).resolves.toEqual({
    value: signUp?.idToken,
    kind: "id-token",
    scheme: "Bearer",
  });

  const forced = await session.getToken("api", { forceRefresh: true });

  expect(forced).toEqual({
    value: endpoints.issued.at(-1)?.idToken,
    kind: "id-token",
    scheme: "Bearer",
  });
  expect(forced.value).not.toBe(signUp?.idToken);
  expect(endpoints.requests).toContain(`token refresh_token ${user.uid}`);
  expect(getSignedInSession(anchor.session.get()).key).toBe(session.key);

  await expect(session.end()).resolves.toEqual({
    local: "completed",
    remote: "not-applicable",
    navigation: null,
  });
  expect(auth.currentUser).toBe(null);
  expect(anchor.session.get()).toEqual({ status: "signed-out" });

  anchor.dispose();
});

test("a token the native side mints after it switched users, before React Native Firebase's JavaScript heard of the switch, is refused with SESSION_CHANGED", async () => {
  const auth = getAuth(await initializeFirebaseApp("anchor-switch"));
  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const { user: ada } = await signInAnonymously(auth);

  const session = firebase({ sdk: auth, tokens: { api: idToken() } }).open(
    observer,
  );

  await signInNativelyWithCustomToken(getNativeAuth("anchor-switch"), "grace");

  expect(auth.currentUser?.uid).toBe(ada.uid);

  await expect(
    session.getToken?.({
      profile: "api",
      forceRefresh: false,
      session: identify(ada.uid),
      signal: new AbortController().signal,
    }),
  ).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  expect(endpoints.issued.at(-1)?.uid).toBe("grace");

  await session.dispose?.();
});

test("ending after the native side signed out on its own, before React Native Firebase's JavaScript heard of it, signs nobody out", async () => {
  const auth = getAuth(await initializeFirebaseApp("anchor-signed-out"));
  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const { user: ada } = await signInAnonymously(auth);

  const session = firebase({ sdk: auth }).open(observer);

  await signOutNatively(getNativeAuth("anchor-signed-out"));

  expect(auth.currentUser?.uid).toBe(ada.uid);

  await expect(
    session.end?.({
      session: identify(ada.uid),
      signal: new AbortController().signal,
    }),
  ).resolves.toEqual({
    local: "not-applicable",
    remote: "not-applicable",
    navigation: null,
  });

  await session.dispose?.();
});

test("the real Auth's changes reach the adapter until dispose removes its listener", async () => {
  const auth = getAuth(await initializeFirebaseApp("anchor-dispose"));
  const observer = { session: vi.fn(), invalidate: vi.fn() };
  const session = firebase({ sdk: auth }).open(observer);

  await expect
    .poll(() => observer.session.mock.calls)
    .toEqual([[{ status: "signed-out" }]]);

  await session.dispose?.();

  const heard: (string | null)[] = [];

  auth.onIdTokenChanged((user) => heard.push(user?.uid ?? null));

  const { user } = await signInAnonymously(auth);

  await expect.poll(() => heard).toContain(user.uid);

  expect(observer.session.mock.calls).toEqual([[{ status: "signed-out" }]]);
  expect(observer.invalidate.mock.calls).toEqual([]);
});
