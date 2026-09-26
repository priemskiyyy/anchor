import clsx from "clsx";
import type React from "react";
import type { ReactNode } from "react";

import type { HighlightTarget } from "example-shared/lab/types/HighlightTarget";
import { highlightStyles } from "example-shared/ui/styles/highlightStyles";
import { useIsHighlighted } from "src/hooks/useIsHighlighted";

type HighlightFrameProps = {
  target: HighlightTarget;
  className?: string;
  children: ReactNode;
};

export const HighlightFrame: React.FunctionComponent<HighlightFrameProps> = ({
  target,
  className,
  children,
}) => {
  const highlighted = useIsHighlighted(target);

  return (
    <div
      data-highlighted={highlighted}
      className={clsx(highlightStyles({ highlighted }), className)}
    >
      {children}
    </div>
  );
};
