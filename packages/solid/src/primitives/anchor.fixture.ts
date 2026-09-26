import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAnswer } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import type { MockAdapterOptions } from "@priemskiyyy/anchor/mock";

import type { RegisteredAnchor } from "src/types/Register";

export const signedIn = (
  subject: string,
  name = subject,
): SessionAnswer<unknown> => ({
  status: "signed-in",
  principal: { authority: "https://login.example.com", subject, tenant: null },
  user: { name },
  context: null,
  guest: false,
  impersonated: false,
});

export const createAnchor = (
  options: MockAdapterOptions<unknown, string> = {},
) => {
  const mock = createMockAdapter<unknown, string>({
    tokens: { api: {} },
    ...options,
  });

  const anchor: RegisteredAnchor = new Anchor({ adapter: mock.adapter });
  const live = { subscriptions: 0 };
  const subscribe = anchor.session.subscribe;

  anchor.session.subscribe = (listener) => {
    live.subscriptions += 1;

    const release = subscribe(listener);

    return () => {
      live.subscriptions -= 1;
      release();
    };
  };

  return { mock, anchor, live };
};
