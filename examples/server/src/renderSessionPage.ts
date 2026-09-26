import type {
  RequestSessionState,
  SessionHydration,
} from "@priemskiyyy/anchor-server";

import type { PageUser } from "src/types/PageUser";
import { MAXIMUM_NAME_LENGTH } from "src/utils/constants/server";
import { getSessionSummary } from "src/utils/getSessionSummary";

const SIGN_UP_FORM = `<form method="post" action="/sign-up">
        <label>Name <input name="name" maxlength="${MAXIMUM_NAME_LENGTH}" autocomplete="off" /></label>
        <button type="submit">Sign up as a new visitor</button>
      </form>`;

const SIGN_OUT_FORM = `<form method="post" action="/sign-out">
        <button type="submit">Sign out</button>
      </form>`;

/** The page for one request: what its session is, the form that changes it, and the hydration the browser's Anchor may show while it reads its own provider. */
export const renderSessionPage = <TUser extends PageUser>(
  state: RequestSessionState<TUser>,
  hydration: SessionHydration<PageUser>,
) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Session Lab server</title>
  </head>
  <body style="font-family: system-ui, sans-serif; max-width: 40rem; margin: 3rem auto; padding: 0 1rem">
    <main>
      <h1>Session Lab server</h1>
      <p id="session-summary">${getSessionSummary(state)}</p>
      ${state.status === "signed-out" ? SIGN_UP_FORM : SIGN_OUT_FORM}
      <script type="application/json" id="session-hydration">${JSON.stringify(hydration).replaceAll("<", "\\u003c")}</script>
    </main>
  </body>
</html>
`;
