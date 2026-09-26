import type React from "react";

import { describeEndResult } from "example-shared/formatting/describeEndResult";
import type { EndedSession } from "example-shared/harbor/types/EndedSession";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { LogoutPageLink } from "src/components/Harbor/LogoutPageLink";

type EndedNoticeProps = { ended: EndedSession };

export const EndedNotice: React.FunctionComponent<EndedNoticeProps> = ({
  ended,
}) => (
  <HighlightFrame target="app-ended">
    <div
      role="status"
      aria-label="Sign-out result"
      className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
    >
      <p className="font-semibold">You signed out.</p>
      <ul className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
        {describeEndResult(ended.result, ended.provider).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {ended.result.navigation === null ? null : (
        <LogoutPageLink
          url={ended.result.navigation.url}
          label={ended.provider.label}
          opened={ended.opened}
        />
      )}
    </div>
  </HighlightFrame>
);
