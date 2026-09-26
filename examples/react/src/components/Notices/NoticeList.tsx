import type React from "react";

import { NoticeCard } from "src/components/Common/NoticeCard";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

// Notices about the whole lab, such as a start that failed; a misbehavior's own result shows on its card.
export const NoticeList: React.FunctionComponent = () => {
  const lab = useLab();

  const notices = useObservable(lab.notices).filter(
    ({ misbehavior }) => misbehavior === null,
  );

  return (
    <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
      {notices.map((notice) => (
        <NoticeCard
          key={notice.id}
          notice={notice}
          onDismiss={() => lab.dismissNotice(notice.id)}
        />
      ))}
    </div>
  );
};
