import { useSession } from "@priemskiyyy/anchor-react";
import clsx from "clsx";
import type React from "react";

import { getMisbehaviorRows } from "example-shared/lab/getMisbehaviorRows";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { HighlightFrame } from "src/components/Common/HighlightFrame";
import { SectionHeading } from "src/components/Common/SectionHeading";
import { MisbehaviorItem } from "src/components/Misbehave/MisbehaviorItem";
import { useLab } from "src/hooks/useLab";
import { useObservable } from "src/hooks/useObservable";

export const MisbehavePanel: React.FunctionComponent = () => {
  const lab = useLab();
  const { provider } = useObservable(lab.runtime);
  const world = useObservable(lab.world);
  const misbehaving = useObservable(lab.misbehaving);
  const results = useObservable(lab.notices);
  const status = useSession((state) => state.status);

  return (
    <HighlightFrame target="misbehaviors">
      <section
        aria-labelledby="misbehave-title"
        className={clsx("flex flex-col gap-4 p-4 sm:p-5", CARD_CLASS_NAME)}
      >
        <SectionHeading
          id="misbehave-title"
          title="Make the provider misbehave"
          shows={`Each is something ${provider.name}'s SDK really does. What ${provider.name} cannot do says why.`}
        />
        <ul className="grid gap-3 sm:grid-cols-2">
          {getMisbehaviorRows(provider, status, world).map(
            ({ misbehavior, available, note, on }) => (
              <MisbehaviorItem
                key={misbehavior.id}
                misbehavior={misbehavior}
                available={available}
                note={note}
                on={on}
                running={misbehaving === misbehavior.id}
                blocked={misbehaving !== null}
                result={results.find(
                  (result) => result.misbehavior === misbehavior.id,
                )}
                onPress={() => lab.misbehave(misbehavior.id)}
                onDismissResult={lab.dismissNotice}
              />
            ),
          )}
        </ul>
      </section>
    </HighlightFrame>
  );
};
