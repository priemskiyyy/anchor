import type { SessionAnswer } from "@priemskiyyy/anchor";

import type { ServerSessionAdapter } from "src/types/ServerSessionAdapter";
import type { ServerSessionRequest } from "src/types/ServerSessionRequest";

type FakeUser = { id: string; name: string };

type HeldRead = {
  request: ServerSessionRequest;
  settle: () => void;
};

const AUTHORITY = "https://auth.example.com";

const getSessionCookie = (headers: Headers) =>
  /(?:^|;\s*)session=([^;]+)/.exec(headers.get("cookie") ?? "")?.[1] ?? null;

/**
 * A provider's server SDK for the tests: sessions keyed by the value of a
 * `session` cookie, a refreshed cookie on every read of a live session, and
 * reads that can be held to settle in any order.
 */
export const createFakeServerAdapter = () => {
  const sessions = new Map<string, FakeUser>();
  const held: HeldRead[] = [];
  const failures: { read: unknown } = { read: null };
  let holdReads = false;

  const getAnswer = ({
    headers,
    responseHeaders,
  }: ServerSessionRequest): SessionAnswer<FakeUser> => {
    if (failures.read !== null) {
      throw failures.read;
    }

    const cookie = getSessionCookie(headers);
    const user = cookie === null ? undefined : sessions.get(cookie);

    if (cookie === null || user === undefined) {
      return { status: "signed-out" };
    }

    responseHeaders.append(
      "set-cookie",
      `session=${cookie}; Path=/; HttpOnly; Max-Age=604800`,
    );

    return {
      status: "signed-in",
      principal: { authority: AUTHORITY, subject: user.id, tenant: null },
      user,
      context: cookie,
      guest: false,
      impersonated: false,
    };
  };

  const adapter = {
    name: "fake-server",
    native: { sessions },
    read: (request: ServerSessionRequest) => {
      if (!holdReads) {
        return getAnswer(request);
      }

      return new Promise<SessionAnswer<FakeUser>>((resolve, reject) => {
        held.push({
          request,
          settle: () => {
            try {
              resolve(getAnswer(request));
            } catch (error) {
              reject(error);
            }
          },
        });
      });
    },
  } satisfies ServerSessionAdapter<
    FakeUser,
    { sessions: Map<string, FakeUser> }
  >;

  return {
    adapter,
    held,
    failures,
    holdReads: () => {
      holdReads = true;
    },
    signIn: (cookie: string, id: string) => {
      sessions.set(cookie, { id, name: id.toUpperCase() });
    },
    signOutRequest: (headers: Headers) => {
      const cookie = getSessionCookie(headers);

      if (cookie === null) {
        return;
      }

      sessions.delete(cookie);
    },
  };
};

export const requestWithCookie = (cookie: string | null) =>
  new Request("https://app.example.com/projects", {
    headers: cookie === null ? {} : { cookie: `session=${cookie}` },
  });
