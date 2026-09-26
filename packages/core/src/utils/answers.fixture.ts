import type { SessionAnswer } from "src/types/SessionAnswer";

export type User = { name: string };

type Identified = Exclude<SessionAnswer<User>, { status: "signed-out" }>;

type Overrides = {
  context?: string | null;
  tenant?: string | null;
  guest?: boolean;
  impersonated?: boolean;
  user?: User;
};

export const AUTHORITY = "https://login.example.com";

export const signedIn = (
  subject: string,
  {
    context = null,
    tenant = null,
    guest = false,
    impersonated = false,
    user = { name: subject },
  }: Overrides = {},
): Identified => ({
  status: "signed-in",
  principal: { authority: AUTHORITY, subject, tenant },
  user,
  context,
  guest,
  impersonated,
});

export const actionRequired = (
  subject: string,
  kind: string,
  overrides: Overrides = {},
): Identified => ({
  ...signedIn(subject, overrides),
  status: "action-required",
  action: { kind },
});

export const signedOut: SessionAnswer<User> = { status: "signed-out" };

export const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
