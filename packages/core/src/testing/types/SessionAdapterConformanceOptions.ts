import type { SessionAdapterFixture } from "src/testing/types/SessionAdapterFixture";

/**
 * What `testSessionAdapter` needs: a label for its `describe` block and a
 * factory for a fresh fixture per test.
 *
 * @example
 * ```ts
 * const options: SessionAdapterConformanceOptions<User, FakeAuth, "api"> = {
 *   name: "firebase",
 *   createFixture: () => createFirebaseFixture(),
 * };
 * ```
 */
export type SessionAdapterConformanceOptions<
  TUser,
  TNative,
  TProfile extends string,
> = {
  /** Labels the generated block as `<name> adapter conformance`. */
  name: string;
  /** Creates a cold adapter over a fresh fake SDK, once per test. */
  createFixture: () =>
    | SessionAdapterFixture<TUser, TNative, TProfile>
    | Promise<SessionAdapterFixture<TUser, TNative, TProfile>>;
};
