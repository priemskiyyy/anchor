import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAnswer } from "@priemskiyyy/anchor";
import { createMockAdapter } from "@priemskiyyy/anchor/mock";
import type { MockAdapterOptions } from "@priemskiyyy/anchor/mock";

export const AUTHORITY = "https://login.example.com";

export const signedIn = (
  subject: string,
  tenant: string | null = null,
): Extract<SessionAnswer<unknown>, { status: "signed-in" }> => ({
  status: "signed-in",
  principal: { authority: AUTHORITY, subject, tenant },
  user: { name: subject },
  context: null,
  guest: false,
  impersonated: false,
});

export const createAnchor = (
  options: MockAdapterOptions<unknown, string> = {},
) => {
  const mock = createMockAdapter<unknown, string>({
    name: "mocked",
    tokens: { api: {} },
    ...options,
  });

  const anchor = new Anchor<unknown, unknown, string>({
    adapter: mock.adapter,
  });

  return { mock, anchor };
};
