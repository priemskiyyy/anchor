import { ArrowClockwise, Timer } from "@phosphor-icons/react";
import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import type React from "react";

import { formatShortKey } from "example-shared/formatting/formatShortKey";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { ProjectsBody } from "src/components/Harbor/ProjectsBody";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type ProjectsCardProps = { session: RegisteredSession };

export const ProjectsCard: React.FunctionComponent<ProjectsCardProps> = ({
  session,
}) => {
  const lab = useLab();
  const { workspaces } = useObservable(lab.harbor.view);
  const workspace = workspaces[session.key];
  const loading = workspace === undefined || workspace.status === "loading";

  return (
    <HighlightFrame target="app-projects">
      <section
        aria-label="Projects"
        className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-semibold">
            Projects
            {workspace?.status === "ready" ? (
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                {" "}
                in {workspace.organization.name}
              </span>
            ) : null}
          </h3>
          <button
            type="button"
            disabled={loading}
            onClick={() => lab.harbor.loadProjects(session, { slowly: false })}
            className={buttonStyles({ size: "small" })}
          >
            <ArrowClockwise aria-hidden="true" size={14} weight="bold" />
            Reload
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => lab.harbor.loadProjects(session, { slowly: true })}
            className={buttonStyles({ size: "small" })}
          >
            <Timer aria-hidden="true" size={14} weight="bold" />
            Load slowly
          </button>
        </div>
        <ProjectsBody workspace={workspace} />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Cached under session key{" "}
          <span className="font-mono">{formatShortKey(session.key)}</span>, so
          no other session can ever see this list.
        </p>
      </section>
    </HighlightFrame>
  );
};
