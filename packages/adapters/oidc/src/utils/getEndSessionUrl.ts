import type { OidcUserManagerLike } from "src/types/OidcUserManagerLike";

export const getEndSessionUrl = (
  endpoint: string,
  idToken: string | undefined,
  {
    client_id,
    post_logout_redirect_uri,
    extraQueryParams,
  }: OidcUserManagerLike["settings"],
) => {
  const url = new URL(endpoint);

  // The parameters, their order and their conditions are those of oidc-client-ts's own SignoutRequest.
  if (idToken) {
    url.searchParams.append("id_token_hint", idToken);
  }

  if (!idToken && post_logout_redirect_uri) {
    url.searchParams.append("client_id", client_id);
  }

  if (post_logout_redirect_uri) {
    url.searchParams.append(
      "post_logout_redirect_uri",
      post_logout_redirect_uri,
    );
  }

  for (const [key, value] of Object.entries(extraQueryParams)) {
    url.searchParams.append(key, String(value));
  }

  return url.href;
};
