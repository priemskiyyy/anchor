import { useSession } from "@priemskiyyy/anchor-react";
import type React from "react";

import { STATUS_LABELS } from "example-shared/lab/constants/labels";
import { STATUS_TONES } from "example-shared/ui/constants/tones";
import { dotStyles } from "example-shared/ui/styles/dotStyles";
import { Badge } from "src/components/Common/Badge";

export const SessionStatusBadge: React.FunctionComponent = () => {
  const status = useSession((state) => state.status);
  const tone = STATUS_TONES[status];

  return (
    <Badge tone={tone}>
      <span aria-hidden="true" className={dotStyles({ tone })} />
      {STATUS_LABELS[status]}
    </Badge>
  );
};
