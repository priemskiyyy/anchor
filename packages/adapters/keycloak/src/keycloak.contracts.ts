import { Anchor } from "@priemskiyyy/anchor";
import type { SessionAdapter } from "@priemskiyyy/anchor";
import type Keycloak from "keycloak-js";
import type { KeycloakTokenParsed } from "keycloak-js";
import { expectTypeOf } from "vitest";

import { accessToken } from "src/accessToken";
import { keycloak } from "src/keycloak";
import type { KeycloakClaimsOf } from "src/types/KeycloakClaimsOf";
import type { KeycloakLike } from "src/types/KeycloakLike";
import type { KeycloakSessionUser } from "src/types/KeycloakSessionUser";

declare const instance: Keycloak;

expectTypeOf(instance).toExtend<KeycloakLike>();
expectTypeOf<KeycloakClaimsOf<Keycloak>>().toEqualTypeOf<KeycloakTokenParsed>();

const adapter = keycloak({
  sdk: instance,
  tokens: { api: accessToken(), reports: accessToken() },
});

expectTypeOf(adapter).toEqualTypeOf<
  SessionAdapter<KeycloakSessionUser, Keycloak, "api" | "reports">
>();
expectTypeOf(new Anchor({ adapter }).native).toEqualTypeOf<Keycloak>();

const mapped = keycloak({
  sdk: instance,
  user: (claims) => {
    expectTypeOf(claims).toEqualTypeOf<KeycloakTokenParsed>();

    return { subject: claims.sub, roles: claims.realm_access?.roles ?? [] };
  },
});

expectTypeOf(mapped).toEqualTypeOf<
  SessionAdapter<
    { subject: string | undefined; roles: string[] },
    Keycloak,
    never
  >
>();

// @ts-expect-error The adapter takes the instance, not the promise init() answers.
export const wrongSdk = keycloak({ sdk: instance.init() });

export const wrongProfile = keycloak({
  sdk: instance,
  // @ts-expect-error keycloak-js mints access tokens only.
  tokens: { api: { kind: "id-token" } },
});
