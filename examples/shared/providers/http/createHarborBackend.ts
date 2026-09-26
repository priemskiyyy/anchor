import type { EndRequest, TokenRequest } from "@priemskiyyy/anchor";

import {
  HTTP_ID,
  HTTP_SUBJECTS,
  HTTP_TOKEN_PREFIX,
  SETUP_MFA_ACTION,
} from "example-shared/providers/http/constants/http";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import type { LabWorld } from "example-shared/world/types/LabWorld";
import type { OrganizationId } from "example-shared/world/types/OrganizationId";
import type { PersonId } from "example-shared/world/types/PersonId";
import type { ServerSession } from "example-shared/world/types/ServerSession";

const getSessionContext = ({ organization, id }: ServerSession) =>
  JSON.stringify([organization, id]);

/**
 * Harbor's own client for its session endpoints, as the http adapter's fake
 * backend: the server keeps one cookie session per browser, answers a missing
 * or ended one with a 401, mints tokens for whoever the cookie names, and ends
 * only the session a request names.
 */
export const createHarborBackend = (world: LabWorld) => {
  const getHeldSession = () => {
    const server = world.getHeldSession(HTTP_ID);

    return server === null || server.ended ? null : server;
  };

  return {
    getSession: async () => {
      world.countCall();
      await world.waitForServer();

      const server = getHeldSession();

      if (server === null) {
        return null;
      }

      return {
        subject: HTTP_SUBJECTS[server.person],
        user: {
          name: world.getName(server.person),
          email: PEOPLE[server.person].email,
        },
        context: getSessionContext(server),
        action: server.action === null ? null : { kind: server.action },
      };
    },
    endSession: async ({ session }: EndRequest) => {
      world.countCall();
      await world.waitForServer();

      const server = getHeldSession();

      if (server === null || getSessionContext(server) !== session.context) {
        return;
      }

      world.endSession(server.id);
      world.holdSession(HTTP_ID, null);
    },
    mintToken: async ({ forceRefresh }: TokenRequest<string>) => {
      world.countCall();

      // The cookie leaves with the request, so the server mints for whoever this browser held then.
      const server = getHeldSession();

      await (forceRefresh ? world.waitForRefresh() : world.waitForServer());

      const latest = server === null ? null : world.getSession(server.id);

      if (latest === null || latest.ended) {
        throw new Error("The token endpoint answered 401.");
      }

      return {
        value: world.issueToken(latest, HTTP_TOKEN_PREFIX),
        subject: HTTP_SUBJECTS[latest.person],
        scheme: "Bearer",
      };
    },
    signIn: async (person: PersonId, organization: OrganizationId) => {
      world.countCall();
      await world.waitForServer();
      world.holdSession(
        HTTP_ID,
        world.openSession({ provider: HTTP_ID, person, organization }),
      );
    },
    switchOrganization: async (organization: OrganizationId) => {
      world.countCall();
      await world.waitForServer();

      const server = getHeldSession();

      if (server === null) {
        return;
      }

      world.updateSession(server.id, { organization });
    },
    completeTwoFactor: async () => {
      world.countCall();
      await world.waitForServer();

      const server = getHeldSession();

      if (server === null) {
        return;
      }

      world.updateSession(server.id, { action: null });
    },
    updateProfile: async (name: string) => {
      world.countCall();
      await world.waitForServer();

      const server = getHeldSession();

      if (server === null) {
        return;
      }

      world.setName(server.person, name);
    },
    // Another tab signs in and the cookie changes, and nothing tells this tab.
    signInElsewhere: () => {
      const server = getHeldSession();
      const person = server === null ? "ada" : OTHER_PEOPLE[server.person];

      world.holdSession(
        HTTP_ID,
        world.openSession({
          provider: HTTP_ID,
          person,
          organization: PEOPLE[person].organization,
        }),
      );
    },
    requireTwoFactor: () => {
      const server = getHeldSession();

      if (server === null) {
        return;
      }

      world.updateSession(server.id, { action: SETUP_MFA_ACTION });
    },
  };
};
