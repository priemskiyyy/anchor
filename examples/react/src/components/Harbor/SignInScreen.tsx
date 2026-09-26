import type React from "react";

import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { PEOPLE, PERSON_IDS } from "example-shared/world/constants/people";
import { Monogram } from "src/components/Common/Monogram";
import { EndedNotice } from "src/components/Harbor/EndedNotice";
import { HarborMark } from "src/components/Harbor/HarborMark";
import { HarborNoticeLine } from "src/components/Harbor/HarborNoticeLine";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const SignInScreen: React.FunctionComponent = () => {
  const lab = useLab();
  const { busy, notice, ended } = useObservable(lab.harbor.view);
  const signingIn = busy?.kind === "sign-in" ? busy.person : null;

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-5 py-2">
      {ended === null ? null : <EndedNotice ended={ended} />}
      <div className="flex flex-col gap-1.5 text-center">
        <HarborMark />
        <h3 className="text-xl font-semibold tracking-tight">
          Sign in to Harbor
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your team&apos;s notes, in one place.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {PERSON_IDS.map((person) => (
          <button
            key={person}
            type="button"
            disabled={busy !== null}
            onClick={() => lab.harbor.signIn(person)}
            className={buttonStyles({ size: "regular" })}
          >
            <Monogram
              text={PEOPLE[person].initials}
              tone={PEOPLE[person].tone}
              shape="tile"
            />
            {signingIn === person
              ? "Signing in…"
              : `Continue as ${PEOPLE[person].firstName}`}
          </button>
        ))}
      </div>
      <HarborNoticeLine notice={notice} />
    </div>
  );
};
