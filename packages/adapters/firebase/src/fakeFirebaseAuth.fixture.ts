import type { FirebaseAuthLike } from "src/types/FirebaseAuthLike";
import type { FirebaseUserLike } from "src/types/FirebaseUserLike";

type FakeUserOptions = {
  tenantId?: string | null;
  anonymous?: boolean;
};

export type FakeFirebaseUser = FirebaseUserLike & {
  minted: { count: number; forced: number };
};

// Modelled on firebase 12.19.0: a listener added to onIdTokenChanged is called once the persisted user is restored, then on every sign-in, sign-out and token change.
export const createFakeFirebaseAuth = ({
  projectId = "anchor-demo",
  restored = true,
}: { projectId?: string; restored?: boolean } = {}) => {
  const listeners = new Set<(user: FirebaseUserLike | null) => void>();
  const failures: { token: unknown } = { token: null };

  let finishRestoring = () => {};

  const restoring = new Promise<void>((resolve) => {
    finishRestoring = resolve;
  });

  if (restored) {
    finishRestoring();
  }

  let current: FakeFirebaseUser | null = null;

  const createUser = (
    uid: string,
    { tenantId = null, anonymous = false }: FakeUserOptions = {},
  ): FakeFirebaseUser => {
    const minted = { count: 0, forced: 0 };

    return {
      uid,
      isAnonymous: anonymous,
      tenantId,
      email: anonymous ? null : `${uid}@example.com`,
      emailVerified: !anonymous,
      displayName: anonymous ? null : uid.toUpperCase(),
      photoURL: null,
      phoneNumber: null,
      minted,
      getIdToken: async (forceRefresh = false) => {
        if (failures.token !== null) {
          throw failures.token;
        }

        minted.count += 1;
        minted.forced += forceRefresh ? 1 : 0;

        return `id-token.${uid}.${minted.count}`;
      },
    };
  };

  const emit = () => {
    for (const listener of [...listeners]) {
      listener(current);
    }
  };

  const sdk = {
    app: { options: { projectId } },
    get currentUser() {
      return current;
    },
    authStateReady: () => restoring,
    onIdTokenChanged: (next: (user: FirebaseUserLike | null) => void) => {
      listeners.add(next);
      restoring.then(() => {
        if (!listeners.has(next)) {
          return;
        }

        next(current);
      });

      return () => {
        listeners.delete(next);
      };
    },
    signOut: async () => {
      current = null;
      emit();
    },
  } satisfies FirebaseAuthLike;

  return {
    sdk,
    listeners,
    failures,
    current: () => current,
    restore: (uid: string | null) => {
      current = uid === null ? null : createUser(uid);
      finishRestoring();
    },
    signIn: (uid: string, options: FakeUserOptions = {}) => {
      current = createUser(uid, options);
      emit();
    },
    link: () => {
      if (current === null) {
        return;
      }

      current = {
        ...current,
        isAnonymous: false,
        email: `${current.uid}@example.com`,
      };
      emit();
    },
    switchSilently: (uid: string) => {
      current = createUser(uid);
    },
  };
};
