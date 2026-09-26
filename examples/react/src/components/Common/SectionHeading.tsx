import type React from "react";

type SectionHeadingProps = { id: string; title: string; shows: string };

export const SectionHeading: React.FunctionComponent<SectionHeadingProps> = ({
  id,
  title,
  shows,
}) => (
  <div className="flex flex-col gap-0.5">
    <h2 id={id} className="text-lg font-semibold tracking-tight">
      {title}
    </h2>
    <p className="text-sm text-zinc-600 dark:text-zinc-400">{shows}</p>
  </div>
);
