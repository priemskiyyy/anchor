import { AnchorError } from "@priemskiyyy/anchor";
import type { SessionIdentity, Token, TokenRequest } from "@priemskiyyy/anchor";

import type { Auth0AccessToken } from "src/types/Auth0AccessToken";
import type { Auth0IdTokenParserLike } from "src/types/Auth0IdTokenParserLike";
import type { Auth0Like } from "src/types/Auth0Like";
import type { ApiCredentialsCaches } from "src/utils/ApiCredentialsCaches";
import { getCredentialsError } from "src/utils/getCredentialsError";
import { getLoginKey } from "src/utils/getLoginKey";
import { getStoredCredentials } from "src/utils/getStoredCredentials";
import { getStoredUser } from "src/utils/getStoredUser";
import { isSessionUser } from "src/utils/isSessionUser";

const createSessionChangedError = () =>
  new AnchorError({
    code: "SESSION_CHANGED",
    message:
      "The credentials manager holds another session than the one asked for.",
  });

const getAccessToken = ({
  accessToken,
  tokenType,
}: {
  accessToken: string;
  tokenType: string;
}): Token => ({ value: accessToken, kind: "access-token", scheme: tokenType });

const requestApiAccessToken = (
  sdk: Auth0Like,
  parseIdToken: Auth0IdTokenParserLike,
  caches: ApiCredentialsCaches,
  audience: string,
  { scope }: Auth0AccessToken,
  forceRefresh: boolean,
  session: SessionIdentity,
) =>
  caches.enqueue(async () => {
    const cache = JSON.stringify([audience, scope]);
    const login = getLoginKey(session.principal.subject, session.context);

    // Forcing clears the cache, since getApiCredentials has no flag for it; so does a cache this login did not fill, which may hold another user's credentials.
    if (forceRefresh || !caches.isOwnedBy(cache, login)) {
      await sdk.credentialsManager.clearApiCredentials(audience, scope);
    }

    const credentials = await sdk.credentialsManager.getApiCredentials(
      audience,
      scope,
    );

    if (!isSessionUser(await getStoredUser(sdk, parseIdToken), session)) {
      throw createSessionChangedError();
    }

    caches.setOwner(cache, login);

    return getAccessToken(credentials);
  });

const requestAccessToken = async (
  sdk: Auth0Like,
  parseIdToken: Auth0IdTokenParserLike,
  caches: ApiCredentialsCaches,
  definition: Auth0AccessToken,
  forceRefresh: boolean,
  session: SessionIdentity,
) => {
  const stored = await getStoredCredentials(sdk);

  if (
    stored === null ||
    !isSessionUser(parseIdToken(stored.idToken), session)
  ) {
    throw createSessionChangedError();
  }

  if (definition.audience !== undefined) {
    return requestApiAccessToken(
      sdk,
      parseIdToken,
      caches,
      definition.audience,
      definition,
      forceRefresh,
      session,
    );
  }

  if (!forceRefresh && definition.scope === undefined) {
    return getAccessToken(stored);
  }

  const renewed = await sdk.credentialsManager.getCredentials(
    definition.scope,
    undefined,
    undefined,
    forceRefresh,
  );

  if (!isSessionUser(parseIdToken(renewed.idToken), session)) {
    throw createSessionChangedError();
  }

  return getAccessToken(renewed);
};

export const getSessionAccessToken = async (
  sdk: Auth0Like,
  parseIdToken: Auth0IdTokenParserLike,
  caches: ApiCredentialsCaches,
  tokens: Partial<Record<string, Auth0AccessToken>>,
  { profile, forceRefresh, session }: TokenRequest<string>,
): Promise<Token> => {
  const definition = tokens[profile];

  if (definition === undefined) {
    throw new AnchorError({
      code: "INVALID_CONFIGURATION",
      message: `The Auth0 adapter declares no token profile named "${profile}".`,
    });
  }

  try {
    return await requestAccessToken(
      sdk,
      parseIdToken,
      caches,
      definition,
      forceRefresh,
      session,
    );
  } catch (error) {
    throw getCredentialsError(error);
  }
};
