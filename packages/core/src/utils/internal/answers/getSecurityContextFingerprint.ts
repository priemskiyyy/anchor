import type { IdentifiedAnswer } from "src/types/internal/IdentifiedAnswer";

export const getSecurityContextFingerprint = <TUser>({
  principal,
  context,
  guest,
  impersonated,
}: IdentifiedAnswer<TUser>) =>
  JSON.stringify([
    principal.authority,
    principal.tenant,
    principal.subject,
    context,
    guest,
    impersonated,
  ]);
