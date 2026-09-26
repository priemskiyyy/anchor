import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseUserLike } from "src/types/FirebaseUserLike";

type FakeUserOptions = {
  tenantId?: string | null;
  anonymous?: boolean;
};

type NativeUser = { uid: string; tenantId: string | null; anonymous: boolean };

type IdTokenListener = (user: FirebaseUserLike | null) => void;

// Modelled on @react-native-firebase/auth 26.4.0: JavaScript mirrors the native user as `currentUser` and builds a new User for every change the native SDK reports, authStateReady settles once the native SDK reported its first auth state, onIdTokenChanged calls a listener added after that once on a microtask with the mirrored user even when it was removed first, native changes reach listeners through React Native's EventEmitter, which calls them in one loop without a catch, getIdTokenResult mints for whichever user the native SDK holds when it runs, and getIdTokenResult and signOut reject with auth/no-current-user while the native SDK holds none.
export const createFakeFirebaseAuth = ({
  projectId = "anchor-demo",
  restored = true,
}: { projectId?: string; restored?: boolean } = {}) => {
  const registrations = new Set<{ listener: IdTokenListener }>();
  const mints: { uid: string; forceRefresh: boolean }[] = [];

  const failures: { token: unknown; signOut: unknown } = {
    token: null,
    signOut: null,
  };

  let finishRestoring = () => {};

  const restoring = new Promise<void>((resolve) => {
    finishRestoring = resolve;
  });

  let ready = restored;
  let native: NativeUser | null = null;
  let current: FirebaseUserLike | null = null;

  if (restored) {
    finishRestoring();
  }

  const createNoCurrentUserError = () =>
    Object.assign(
      new Error("[auth/no-current-user] No user currently signed in."),
      { code: "auth/no-current-user" },
    );

  const createNativeUser = (
    uid: string,
    { tenantId = null, anonymous = false }: FakeUserOptions = {},
  ): NativeUser => ({ uid, tenantId, anonymous });

  const mintIdTokenResult = async (forceRefresh: boolean) => {
    if (failures.token !== null) {
      throw failures.token;
    }

    const holder = native;

    if (holder === null) {
      throw createNoCurrentUserError();
    }

    mints.push({ uid: holder.uid, forceRefresh });

    return {
      token: `id-token.${holder.uid}.${mints.length}`,
      claims: {
        iss: `https://securetoken.google.com/${projectId}`,
        aud: projectId,
        sub: holder.uid,
        user_id: holder.uid,
        firebase: {
          sign_in_provider: holder.anonymous ? "anonymous" : "password",
          ...(holder.tenantId === null ? {} : { tenant: holder.tenantId }),
        },
      },
    };
  };

  const createUser = ({
    uid,
    tenantId,
    anonymous,
  }: NativeUser): FirebaseUserLike => ({
    uid,
    isAnonymous: anonymous,
    tenantId,
    email: anonymous ? null : `${uid}@example.com`,
    emailVerified: !anonymous,
    displayName: anonymous ? null : uid.toUpperCase(),
    photoURL: null,
    phoneNumber: null,
    getIdTokenResult: (forceRefresh = false) => mintIdTokenResult(forceRefresh),
  });

  const mirrorNativeUser = () => {
    current = native === null ? null : createUser(native);
    ready = true;
  };

  const emit = () => {
    for (const { listener } of [...registrations]) {
      listener(current);
    }
  };

  const sdk = {
    app: { options: { projectId } },
    get currentUser() {
      return current;
    },
    authStateReady: () => (ready ? Promise.resolve() : restoring),
    onIdTokenChanged: (listener: IdTokenListener) => {
      const registration = { listener };

      registrations.add(registration);

      if (ready) {
        Promise.resolve().then(() => listener(current));
      }

      return () => {
        registrations.delete(registration);
      };
    },
    signOut: async () => {
      if (failures.signOut !== null) {
        throw failures.signOut;
      }

      if (native === null) {
        throw createNoCurrentUserError();
      }

      native = null;
      mirrorNativeUser();
      emit();
    },
  } satisfies FirebaseAuthLike;

  return {
    sdk,
    mints,
    failures,
    listeners: () => registrations.size,
    current: () => current,
    nativeUser: () => native?.uid ?? null,
    restore: (uid: string | null, options: FakeUserOptions = {}) => {
      native = uid === null ? null : createNativeUser(uid, options);
      mirrorNativeUser();
      finishRestoring();
      emit();
    },
    signIn: (uid: string, options: FakeUserOptions = {}) => {
      native = createNativeUser(uid, options);
      mirrorNativeUser();
      emit();
    },
    link: () => {
      if (native === null) {
        return;
      }

      native = { ...native, anonymous: false };
      mirrorNativeUser();
      emit();
    },
    switchSilently: (uid: string) => {
      native = createNativeUser(uid);
      mirrorNativeUser();
    },
    switchNatively: (uid: string) => {
      native = createNativeUser(uid);
    },
    signOutNatively: () => {
      native = null;
    },
  };
};
