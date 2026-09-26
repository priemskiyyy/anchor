import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import type React from "react";

import { AccountBar } from "src/components/Harbor/AccountBar";
import { ProjectsCard } from "src/components/Harbor/ProjectsCard";

type WorkspaceScreenProps = { session: RegisteredSession };

export const WorkspaceScreen: React.FunctionComponent<WorkspaceScreenProps> = ({
  session,
}) => (
  <div className="flex flex-col gap-4">
    <AccountBar session={session} />
    <ProjectsCard session={session} />
  </div>
);
