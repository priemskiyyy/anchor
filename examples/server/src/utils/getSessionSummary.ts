import type { RequestSessionState } from "@priemskiyyy/anchor-server";

import { escapeHtml } from "src/utils/escapeHtml";

/** One escaped sentence for the page about the request's session. */
export const getSessionSummary = <TUser extends { name: string }>(
  state: RequestSessionState<TUser>,
) => {
  if (state.status === "signed-in") {
    return `Signed in as ${escapeHtml(state.session.user.name)}.`;
  }

  if (state.status === "action-required") {
    return `Signed in as ${escapeHtml(state.session.user.name)}, who must finish ${escapeHtml(state.action.kind)} first.`;
  }

  if (state.status === "unavailable") {
    return `The session provider is unavailable (${state.error.code}). That is not a sign-out.`;
  }

  return "Signed out.";
};
