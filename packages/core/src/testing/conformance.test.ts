import { createMockAdapter } from "src/mock/createMockAdapter";
import { testSessionAdapter } from "src/testing/testSessionAdapter";
import { signedIn, signedOut } from "src/utils/answers.fixture";
import type { User } from "src/utils/answers.fixture";

const createMockFixture = (options: { observes: boolean }) => {
  const mock = createMockAdapter<User, "api" | "reports">({
    tokens: { api: {}, reports: {} },
  });

  const change = (answer: typeof signedOut) => {
    if (options.observes) {
      mock.push(answer);

      return;
    }

    mock.change(answer);
  };

  return {
    adapter: mock.adapter,
    native: mock.adapter.native,
    profiles: ["api", "reports"] satisfies ("api" | "reports")[],
    signIn: (subject: string) => change(signedIn(subject)),
    signOut: () => change(signedOut),
    listeners: () =>
      mock.sessions.filter(({ disposeCount }) => disposeCount === 0).length,
    observes: options.observes,
    switchSilently: (subject: string) => mock.change(signedIn(subject)),
  };
};

testSessionAdapter({
  name: "pushing mock",
  createFixture: () => createMockFixture({ observes: true }),
});

testSessionAdapter({
  name: "silent mock",
  createFixture: () => createMockFixture({ observes: false }),
});
