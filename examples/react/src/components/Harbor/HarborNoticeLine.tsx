import type React from "react";

type HarborNoticeLineProps = { notice: string | null };

export const HarborNoticeLine: React.FunctionComponent<
  HarborNoticeLineProps
> = ({ notice }) =>
  notice === null ? null : (
    <p
      role="status"
      className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
    >
      {notice}
    </p>
  );
