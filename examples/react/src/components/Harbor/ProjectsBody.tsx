import type React from "react";
import { match, P } from "ts-pattern";

import { describeCredential } from "example-shared/formatting/describeCredential";
import { describeSlowLoad } from "example-shared/formatting/describeSlowLoad";
import type { WorkspaceView } from "example-shared/harbor/types/WorkspaceView";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type ProjectsBodyProps = { workspace: WorkspaceView | undefined };

export const ProjectsBody: React.FunctionComponent<ProjectsBodyProps> = ({
  workspace,
}) => {
  const { provider } = useObservable(useLab().runtime);

  return match(workspace)
    .with(P.union(undefined, { status: "loading", slowly: false }), () => (
      <p
        role="status"
        className="text-sm text-zinc-500 motion-safe:animate-pulse"
      >
        Loading projects…
      </p>
    ))
    .with({ status: "loading", slowly: true }, () => (
      <p
        role="status"
        className="text-sm text-zinc-500 motion-safe:animate-pulse"
      >
        {describeSlowLoad(provider)}
      </p>
    ))
    .with({ status: "failed" }, ({ message }) => (
      <p
        role="status"
        className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
      >
        {message}
      </p>
    ))
    .with({ status: "ready" }, ({ projects, credential }) => (
      <div className="flex flex-col gap-2">
        <ul aria-label="Project list" className="flex flex-col gap-1.5">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-800/70"
            >
              <span className="font-medium">{project.name}</span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {project.notes} notes
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {describeCredential(credential)}
        </p>
      </div>
    ))
    .exhaustive();
};
