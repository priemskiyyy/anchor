import { describe, expect, test } from "vitest";

import { getRequestSession } from "src/getRequestSession";
import type { ServerSessionAdapterConformanceOptions } from "src/testing/types/ServerSessionAdapterConformanceOptions";
import type { ServerSessionAdapterFixture } from "src/testing/types/ServerSessionAdapterFixture";
import type { RequestSessionState } from "src/types/RequestSessionState";
import { CONFORMANCE_URL } from "src/utils/constants/conformance";

const getSubject = <TUser>(state: RequestSessionState<TUser>) =>
  state.status === "signed-in" ? state.session.principal.subject : null;

const createRequest = <TUser, TNative>(
  { url = CONFORMANCE_URL }: ServerSessionAdapterFixture<TUser, TNative>,
  headers: Headers,
) => new Request(url, { headers });

/**
 * Registers one `describe` block that holds a server adapter to the request
 * contract through `getRequestSession`: no credentials is signed out, a
 * session is signed in as its subject, concurrent requests stay apart, a
 * session ended elsewhere is signed out, the request's own headers stay as
 * they were, and every answer is within the contract.
 *
 * @example
 * ```ts
 * testServerSessionAdapter({ name: "better-auth-node", createFixture: () => createBetterAuthFixture() });
 * ```
 */
export const testServerSessionAdapter = <TUser, TNative>({
  name,
  createFixture,
}: ServerSessionAdapterConformanceOptions<TUser, TNative>) => {
  // The one describe the rules allow here: it names each server adapter's generated block of conformance tests.
  describe(`${name} server adapter conformance`, () => {
    test("the adapter names itself and holds the server SDK the fixture gave it", async () => {
      const { adapter, native } = await createFixture();

      expect(typeof adapter.name).toBe("string");
      expect(adapter.name).not.toBe("");
      expect(adapter.native).toBe(native);
    });

    test("a request without the provider's credentials is signed out", async () => {
      const fixture = await createFixture();

      const { state } = await getRequestSession(
        createRequest(fixture, new Headers()),
        { adapter: fixture.adapter },
      );

      expect(state).toEqual({ status: "signed-out" });
    });

    test("a request carrying a session is signed in as the subject the provider gave its user, within the contract", async () => {
      const fixture = await createFixture();
      const ada = await fixture.signIn("conformance-ada");

      const { state } = await getRequestSession(
        createRequest(fixture, ada.headers),
        { adapter: fixture.adapter },
      );

      expect(state.status).toBe("signed-in");
      expect(getSubject(state)).toBe(ada.subject);
    });

    test("concurrent requests never see each other's session", async () => {
      const fixture = await createFixture();
      const ada = await fixture.signIn("conformance-ada");
      const grace = await fixture.signIn("conformance-grace");

      const [adaRequest, graceRequest, anonymousRequest] = await Promise.all([
        getRequestSession(createRequest(fixture, ada.headers), {
          adapter: fixture.adapter,
        }),
        getRequestSession(createRequest(fixture, grace.headers), {
          adapter: fixture.adapter,
        }),
        getRequestSession(createRequest(fixture, new Headers()), {
          adapter: fixture.adapter,
        }),
      ]);

      expect(getSubject(adaRequest.state)).toBe(ada.subject);
      expect(getSubject(graceRequest.state)).toBe(grace.subject);
      expect(anonymousRequest.state).toEqual({ status: "signed-out" });
    });

    test("a request whose session ended elsewhere is signed out, never unavailable", async () => {
      const fixture = await createFixture();
      const ada = await fixture.signIn("conformance-ada");

      await fixture.signOut(ada.headers);

      const { state } = await getRequestSession(
        createRequest(fixture, ada.headers),
        { adapter: fixture.adapter },
      );

      expect(state).toEqual({ status: "signed-out" });
    });

    test("reading one request twice answers the same principal", async () => {
      const fixture = await createFixture();
      const ada = await fixture.signIn("conformance-ada");
      const request = createRequest(fixture, ada.headers);

      const first = await getRequestSession(request, {
        adapter: fixture.adapter,
      });

      const second = await getRequestSession(request, {
        adapter: fixture.adapter,
      });

      expect(second.state).toEqual(first.state);
    });

    test("the request's own headers are left exactly as they were", async () => {
      const fixture = await createFixture();
      const ada = await fixture.signIn("conformance-ada");
      const request = createRequest(fixture, ada.headers);
      const before = [...request.headers];

      await getRequestSession(request, { adapter: fixture.adapter });

      expect([...request.headers]).toEqual(before);
    });
  });
};
