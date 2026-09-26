import { ArrowSquareOut } from "@phosphor-icons/react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { useLab } from "src/hooks/useLab";

type LogoutPageLinkProps = { url: string; label: string; opened: boolean };

// A real app assigns the page to location; the lab records the visit instead of leaving.
export const LogoutPageLink: React.FunctionComponent<LogoutPageLinkProps> = ({
  url,
  label,
  opened,
}) => {
  const lab = useLab();

  if (opened) {
    return (
      <p className="text-emerald-700 dark:text-emerald-300">
        You opened {label}&apos;s logout page, so its own session ended too.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={lab.harbor.openLogoutPage}
        className={buttonStyles({ size: "small" })}
      >
        <ArrowSquareOut aria-hidden="true" size={14} weight="bold" />
        Open {label}&apos;s logout page
      </button>
      <code className="font-mono text-xs break-all text-zinc-500">{url}</code>
    </div>
  );
};
