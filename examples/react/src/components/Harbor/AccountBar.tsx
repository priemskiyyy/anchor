import { SignOut, UserSwitch } from "@phosphor-icons/react";
import type { RegisteredSession } from "@priemskiyyy/anchor-react";
import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { OTHER_PEOPLE, PEOPLE } from "example-shared/world/constants/people";
import { getPersonByEmail } from "example-shared/world/getPersonByEmail";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { Monogram } from "src/components/Common/Monogram";
import { HarborNoticeLine } from "src/components/Harbor/HarborNoticeLine";
import { OrganizationPicker } from "src/components/Harbor/OrganizationPicker";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

type AccountBarProps = { session: RegisteredSession };

export const AccountBar: React.FunctionComponent<AccountBarProps> = ({
  session,
}) => {
  const lab = useLab();
  const { busy, notice } = useObservable(lab.harbor.view);
  const person = getPersonByEmail(session.user.email);

  if (person === null) {
    return null;
  }

  const other = OTHER_PEOPLE[person];
  const { name, initials, tone } = PEOPLE[person];

  return (
    <HighlightFrame target="app-account" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Monogram text={initials} tone={tone} shape="round" />
        <div className="mr-auto min-w-0">
          <p className="truncate font-semibold">{session.user.name}</p>
          <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
            {session.user.email}
          </p>
        </div>
        <OrganizationPicker session={session} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => lab.harbor.rename(session)}
          className={buttonStyles({ size: "small" })}
        >
          {session.user.name === name ? "Use short name" : "Use full name"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => lab.harbor.signIn(other)}
          className={buttonStyles({ size: "small" })}
        >
          <UserSwitch aria-hidden="true" size={14} weight="bold" />
          Switch to {PEOPLE[other].firstName}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => lab.harbor.signOut(session)}
          className={buttonStyles({ variant: "primary", size: "small" })}
        >
          <SignOut aria-hidden="true" size={14} weight="bold" />
          {busy?.kind === "sign-out" ? "Signing out…" : "Sign out"}
        </button>
      </div>
      <HarborNoticeLine notice={notice} />
    </HighlightFrame>
  );
};
