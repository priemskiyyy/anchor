import type { ServerSessionAdapterFixture } from "src/testing/types/ServerSessionAdapterFixture";

/**
 * Options of `testServerSessionAdapter()`: the block's label, and how to create
 * a fresh fixture for each test.
 *
 * @example
 * ```ts
 * const options: ServerSessionAdapterConformanceOptions<User, typeof auth> = { name: "better-auth-node", createFixture };
 * ```
 */
export type ServerSessionAdapterConformanceOptions<TUser, TNative> = {
  /** Labels the generated block as `<name> server adapter conformance`. */
  name: string;
  /** Creates a cold adapter over a fresh server, once per test. */
  createFixture: () =>
    | ServerSessionAdapterFixture<TUser, TNative>
    | Promise<ServerSessionAdapterFixture<TUser, TNative>>;
};
