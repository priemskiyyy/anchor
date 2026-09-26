import {
  createFakeServerAdapter,
  requestWithCookie,
} from "src/fakeServerAdapter.fixture";
import { testServerSessionAdapter } from "src/testing/testServerSessionAdapter";

testServerSessionAdapter({
  name: "fake-server",
  createFixture: () => {
    const fake = createFakeServerAdapter();
    let sessions = 0;

    return {
      adapter: fake.adapter,
      native: fake.adapter.native,
      signIn: (name) => {
        sessions += 1;

        const cookie = `cookie_${sessions}`;

        fake.signIn(cookie, name);

        return { headers: requestWithCookie(cookie).headers, subject: name };
      },
      signOut: (headers) => {
        fake.signOutRequest(headers);
      },
    };
  },
});
