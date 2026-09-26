import { describe, expect, test } from "vitest";

import type { SessionAdapterConformanceOptions } from "src/testing/types/SessionAdapterConformanceOptions";
import type { SessionAdapterFixture } from "src/testing/types/SessionAdapterFixture";
import type { AnchorDiagnosticEvent } from "src/types/AnchorDiagnosticEvent";
import type { AnchorSession } from "src/types/AnchorSession";
import type { EndResult } from "src/types/EndResult";
import type { SessionState } from "src/types/SessionState";
import { Anchor } from "src/utils/Anchor";
import { AnchorError } from "src/utils/AnchorError";

const getSignedInSession = <TUser, TProfile extends string>(
  state: SessionState<TUser, TProfile>,
): AnchorSession<TUser, TProfile> => {
  if (state.status !== "signed-in") {
    throw new Error(
      `Expected a signed-in session, the state is ${state.status}.`,
    );
  }

  return state.session;
};

const createObservedAnchor = <TUser, TNative, TProfile extends string>(
  fixture: SessionAdapterFixture<TUser, TNative, TProfile>,
) => {
  const anchor = new Anchor({ adapter: fixture.adapter });
  const events: AnchorDiagnosticEvent[] = [];

  anchor.diagnostics.events.subscribe((event) => events.push(event));

  return { anchor, events };
};

const waitForStatus = async <TUser, TNative, TProfile extends string>(
  fixture: SessionAdapterFixture<TUser, TNative, TProfile>,
  anchor: Anchor<TUser, TNative, TProfile>,
  status: SessionState<TUser, TProfile>["status"],
) => {
  if (!fixture.observes) {
    await anchor.sync();
  }

  await expect.poll(() => anchor.session.get().status).toBe(status);
};

const waitForSubject = async <TUser, TNative, TProfile extends string>(
  fixture: SessionAdapterFixture<TUser, TNative, TProfile>,
  anchor: Anchor<TUser, TNative, TProfile>,
  subject: string,
) => {
  await expect
    .poll(async () => {
      if (!fixture.observes) {
        await anchor.sync();
      }

      const state = anchor.session.get();

      return state.status === "signed-in"
        ? state.session.principal.subject
        : null;
    })
    .toBe(subject);
};

/**
 * Registers one `describe` block that holds an adapter to the session
 * contract through a real Anchor: coldness, `native`, the first resolution,
 * observed changes, answers within the contract, tokens bound to their
 * session, ending, and silence after dispose.
 *
 * @example
 * ```ts
 * testSessionAdapter({ name: "firebase", createFixture: () => createFirebaseFixture() });
 * ```
 */
export const testSessionAdapter = <TUser, TNative, TProfile extends string>({
  name,
  createFixture,
}: SessionAdapterConformanceOptions<TUser, TNative, TProfile>) => {
  // The one describe the rules allow: it names each adapter's generated block of conformance tests.
  describe(`${name} adapter conformance`, () => {
    test("the adapter names itself, and creating it installs nothing on the SDK", async () => {
      const fixture = await createFixture();

      expect(typeof fixture.adapter.name).toBe("string");
      expect(fixture.adapter.name).not.toBe("");
      expect(fixture.listeners()).toBe(0);
    });

    test("native is the SDK the fixture gave the adapter", async () => {
      const fixture = await createFixture();
      const { anchor } = createObservedAnchor(fixture);

      expect(anchor.native).toBe(fixture.native);
    });

    test("a provider with no session resolves as signed-out", async () => {
      const fixture = await createFixture();
      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();

      expect(anchor.session.get()).toEqual({ status: "signed-out" });
      anchor.dispose();
    });

    test("a provider with a session resolves as signed-in with the subject it holds", async () => {
      const fixture = await createFixture();

      await fixture.signIn("conformance-ada");

      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();

      expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
        "conformance-ada",
      );
      anchor.dispose();
    });

    test("a sign-in and a sign-out after the start reach the session, and every answer is within the contract", async () => {
      const fixture = await createFixture();
      const { anchor, events } = createObservedAnchor(fixture);

      await anchor.start();
      await fixture.signIn("conformance-ada");
      await waitForStatus(fixture, anchor, "signed-in");

      const ada = getSignedInSession(anchor.session.get());

      await fixture.signIn("conformance-grace");
      await waitForSubject(fixture, anchor, "conformance-grace");

      const grace = getSignedInSession(anchor.session.get());

      expect(grace.key).not.toBe(ada.key);

      // A read agrees with what the adapter pushed, and keeps the session it pushed.
      await anchor.sync();

      expect(getSignedInSession(anchor.session.get()).key).toBe(grace.key);

      await fixture.signOut();
      await waitForStatus(fixture, anchor, "signed-out");

      expect(
        events.flatMap(({ type }) => (type === "answer invalid" ? [type] : [])),
      ).toEqual([]);
      anchor.dispose();
    });

    test("the fixture names every token profile the adapter declares, and each mints a token for the current session", async () => {
      const fixture = await createFixture();

      expect([...fixture.profiles].sort()).toEqual(
        Object.keys(fixture.adapter.tokens).sort(),
      );

      await fixture.signIn("conformance-ada");

      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();

      const session = getSignedInSession(anchor.session.get());

      for (const profile of fixture.profiles) {
        const token = await session.getToken(profile);

        expect(typeof token.value).toBe("string");
        expect(token.value).not.toBe("");
      }

      anchor.dispose();
    });

    test("the adapter refuses to mint for a session its SDK no longer holds", async (context) => {
      const fixture = await createFixture();
      const switchSilently = fixture.switchSilently;
      const [profile] = fixture.profiles;

      // An adapter without token profiles mints nothing, so it has nothing to refuse.
      if (profile === undefined) {
        context.skip();

        return;
      }

      if (switchSilently === undefined) {
        throw new Error(
          `The ${name} fixture declares token profiles, so it must give switchSilently to prove a token is never minted for another session.`,
        );
      }

      await fixture.signIn("conformance-ada");

      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();

      const ada = getSignedInSession(anchor.session.get());

      await switchSilently("conformance-grace");

      await expect(ada.getToken(profile)).rejects.toMatchObject({
        code: "SESSION_CHANGED",
      });
      anchor.dispose();
    });

    test("ending a session another has replaced signs nobody out", async () => {
      const fixture = await createFixture();

      await fixture.signIn("conformance-ada");

      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();

      const ada = getSignedInSession(anchor.session.get());

      await fixture.signIn("conformance-grace");
      await waitForSubject(fixture, anchor, "conformance-grace");

      await expect(ada.end()).resolves.toMatchObject({
        local: "not-applicable",
      });
      await anchor.sync();

      expect(getSignedInSession(anchor.session.get()).principal.subject).toBe(
        "conformance-grace",
      );
      anchor.dispose();
    });

    test("ending the session completes locally or says it cannot tell, and the SDK agrees it is signed out afterwards", async () => {
      const fixture = await createFixture();

      await fixture.signIn("conformance-ada");

      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();

      let result: EndResult;

      try {
        result = await getSignedInSession(anchor.session.get()).end();
      } catch (error) {
        anchor.dispose();

        if (error instanceof AnchorError && error.code === "UNSUPPORTED") {
          return;
        }

        throw error;
      }

      expect(["completed", "unknown"]).toContain(result.local);
      await anchor.sync();
      await expect.poll(() => anchor.session.get().status).toBe("signed-out");
      anchor.dispose();
    });

    test("dispose removes every listener the adapter installed on the SDK", async () => {
      const fixture = await createFixture();
      const { anchor } = createObservedAnchor(fixture);

      await anchor.start();
      anchor.dispose();

      await expect.poll(() => fixture.listeners()).toBe(0);
    });
  });
};
