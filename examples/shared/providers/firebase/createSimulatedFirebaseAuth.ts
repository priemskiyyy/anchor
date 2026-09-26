import type {
  FirebaseAuthLike,
  FirebaseUserLike,
} from "@priemskiyyy/anchor-firebase";

import {
  FIREBASE_ID,
  FIREBASE_PROJECT_ID,
  FIREBASE_TOKEN_PREFIX,
  FIREBASE_UIDS,
  INVALID_CREDENTIAL,
  NETWORK_REQUEST_FAILED,
  USER_TOKEN_EXPIRED,
} from "example-shared/providers/firebase/constants/firebase";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

type IdTokenListener = (user: FirebaseUserLike | null) => void;

type HeldUser = { session: ServerSession; user: FirebaseUserLike };

const createFirebaseError = (code: string) =>
  Object.assign(new Error(`Firebase: Error (${code}).`), { code });

// Modelled on firebase 12.19.0, as the adapter's own fake: the user restores from this browser's storage without the network, and a listener added to onIdTokenChanged hears it, then every sign-in, sign-out and token change, in every tab.
export const createSimulatedFirebaseAuth = (world: LabWorld) => {
  const listeners = new Set<IdTokenListener>();
  let held: HeldUser | null = null;

  const getCurrentUser = () => (held === null ? null : held.user);

  const emit = () => {
    const user = getCurrentUser();

    for (const listener of [...listeners]) {
      listener(user);
    }
  };

  const refreshIdToken = async (session: ServerSession) => {
    try {
      await world.waitForRefresh();
    } catch {
      throw createFirebaseError(NETWORK_REQUEST_FAILED);
    }

    const latest = world.getSession(session.id);

    if (latest === null || latest.ended) {
      throw createFirebaseError(USER_TOKEN_EXPIRED);
    }

    return world.issueToken(latest, FIREBASE_TOKEN_PREFIX);
  };

  const createUser = (session: ServerSession): FirebaseUserLike => {
    let idToken = world.issueToken(session, FIREBASE_TOKEN_PREFIX);

    return {
      uid: FIREBASE_UIDS[session.person],
      isAnonymous: false,
      tenantId: null,
      email: PEOPLE[session.person].email,
      emailVerified: true,
      displayName: world.getName(session.person),
      photoURL: null,
      phoneNumber: null,
      getIdToken: async (forceRefresh = false) => {
        world.countCall();

        if (!forceRefresh) {
          return idToken;
        }

        idToken = await refreshIdToken(session);

        // Firebase notifies a token change only while this user is the current one.
        if (held !== null && held.session.id === session.id) {
          emit();
        }

        return idToken;
      },
    };
  };

  const holdSession = (session: ServerSession | null) => {
    world.holdSession(FIREBASE_ID, session);
    held = session === null ? null : { session, user: createUser(session) };
  };

  const openSession = (person: PersonId) =>
    world.openSession({ provider: FIREBASE_ID, person, organization: null });

  const restoring = world.waitForStorage().then(() => {
    const session = world.getHeldSession(FIREBASE_ID);

    held = session === null ? null : { session, user: createUser(session) };
  });

  const auth = {
    app: { options: { projectId: FIREBASE_PROJECT_ID } },
    get currentUser() {
      return getCurrentUser();
    },
    authStateReady: () => {
      world.countCall();

      return restoring;
    },
    onIdTokenChanged: (next: IdTokenListener) => {
      world.countCall();
      listeners.add(next);
      restoring.then(() => {
        if (!listeners.has(next)) {
          return;
        }

        next(getCurrentUser());
      });

      return () => {
        listeners.delete(next);
      };
    },
    signOut: async () => {
      world.countCall();
      holdSession(null);
      emit();
    },
  } satisfies FirebaseAuthLike;

  return {
    auth,
    /** `signInWithEmailAndPassword(auth, email, password)`, bound to this Auth instance. */
    signInWithEmailAndPassword: async (email: string, password: string) => {
      world.countCall();

      try {
        await world.waitForServer();
      } catch {
        throw createFirebaseError(NETWORK_REQUEST_FAILED);
      }

      const person = getPersonByEmail(email);

      if (person === null || password === "") {
        throw createFirebaseError(INVALID_CREDENTIAL);
      }

      holdSession(openSession(person));
      emit();
    },
    /** `updateProfile(user, { displayName })`, whose new ID token Firebase announces. */
    updateProfile: async (
      user: FirebaseUserLike,
      { displayName }: { displayName: string },
    ) => {
      world.countCall();

      try {
        await world.waitForServer();
      } catch {
        throw createFirebaseError(NETWORK_REQUEST_FAILED);
      }

      if (held === null || held.user.uid !== user.uid) {
        return;
      }

      world.setName(held.session.person, displayName);
      held = { session: held.session, user: { ...held.user, displayName } };
      emit();
    },
    signInElsewhere: () => {
      const person = held === null ? "ada" : OTHER_PEOPLE[held.session.person];

      holdSession(openSession(person));
      emit();
    },
    sendDuplicateEvent: emit,
  };
};
