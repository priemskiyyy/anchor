import type {
  EndRequest,
  ReadContext,
  TokenRequest,
} from "@priemskiyyy/anchor";

type FakeUser = { id: string; name: string };

type FakeSession = {
  id: string;
  user: FakeUser;
  organization: string | null;
};

type FakeFailures = {
  read: Error | null;
  mint: Error | null;
  end: Error | null;
};

const getContext = ({ organization, id }: FakeSession) =>
  JSON.stringify([organization, id]);

/**
 * An application's own backend client for the tests: the server holds one
 * cookie session, and the client records every read, mint and end, answers a
 * missing session as the server's 401, and fails where the test says.
 */
export const createFakeBackend = () => {
  const reads: ReadContext[] = [];
  const mints: TokenRequest<string>[] = [];
  const ends: EndRequest[] = [];

  const failures: FakeFailures = { read: null, mint: null, end: null };

  let sessions = 0;
  let issued = 0;
  let current: FakeSession | null = null;

  const createSession = (
    id: string,
    organization: string | null,
  ): FakeSession => {
    sessions += 1;

    return {
      id: `session_${sessions}`,
      user: { id, name: id.toUpperCase() },
      organization,
    };
  };

  const client = {
    getSession: async (context: ReadContext) => {
      reads.push(context);

      if (failures.read !== null) {
        throw failures.read;
      }

      if (current === null) {
        return null;
      }

      return {
        subject: current.user.id,
        user: current.user,
        context: getContext(current),
      };
    },
    mintToken: async (request: TokenRequest<string>) => {
      mints.push(request);

      if (failures.mint !== null) {
        throw failures.mint;
      }

      if (current === null) {
        throw new Error("The token endpoint answered 401.");
      }

      issued += 1;

      return {
        value: `${request.profile}.${current.user.id}.${issued}`,
        subject: current.user.id,
      };
    },
    endSession: async (request: EndRequest) => {
      ends.push(request);

      if (failures.end !== null) {
        throw failures.end;
      }

      // A server ends only the session the request names.
      if (current === null || getContext(current) !== request.session.context) {
        return;
      }

      current = null;
    },
  };

  return {
    client,
    reads,
    mints,
    ends,
    failures,
    current: () => current,
    signIn: (id: string, organization: string | null = null) => {
      current = createSession(id, organization);
    },
    signOut: () => {
      current = null;
    },
  };
};
