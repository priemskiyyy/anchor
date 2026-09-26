import { useSession } from "@priemskiyyy/anchor-react";
import type React from "react";
import { match } from "ts-pattern";

import { RestoringScreen } from "src/components/Harbor/RestoringScreen";
import { SignInScreen } from "src/components/Harbor/SignInScreen";
import { TwoFactorScreen } from "src/components/Harbor/TwoFactorScreen";
import { UnavailableScreen } from "src/components/Harbor/UnavailableScreen";
import { WorkspaceScreen } from "src/components/Harbor/WorkspaceScreen";

// Harbor's whole screen follows the session state and nothing else.
export const HarborApp: React.FunctionComponent = () =>
  match(useSession())
    .with({ status: "initializing" }, () => <RestoringScreen />)
    .with({ status: "signed-out" }, () => <SignInScreen />)
    .with({ status: "action-required" }, () => <TwoFactorScreen />)
    .with({ status: "unavailable" }, () => <UnavailableScreen />)
    .with({ status: "signed-in" }, ({ session }) => (
      <WorkspaceScreen session={session} />
    ))
    .exhaustive();
