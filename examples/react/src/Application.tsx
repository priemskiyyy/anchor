import { AnchorDevtools } from "@priemskiyyy/anchor-devtools/react";
import { AnchorProvider } from "@priemskiyyy/anchor-react";
import clsx from "clsx";
import type React from "react";
import { useState } from "react";

import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { PAGE_CLASS_NAME } from "example-shared/ui/styles/pageStyles";
import { DevtoolsPointer } from "src/components/Common/DevtoolsPointer";
import { AppWindow } from "src/components/Harbor/AppWindow";
import { HarborApp } from "src/components/Harbor/HarborApp";
import { InspectorPanel } from "src/components/Inspector/InspectorPanel";
import { MisbehavePanel } from "src/components/Misbehave/MisbehavePanel";
import { NoticeList } from "src/components/Notices/NoticeList";
import { TopBar } from "src/components/TopBar/TopBar";
import { TourMenu } from "src/components/Tour/TourMenu";
import { TourPanel } from "src/components/Tour/TourPanel";
import { LabContext } from "src/context/LabContext";
import { useObservable } from "src/hooks/useObservable";

type ApplicationProps = { lab: SessionLab };

export const Application: React.FunctionComponent<ApplicationProps> = ({
  lab,
}) => {
  const runtime = useObservable(lab.runtime);
  const [toursOpen, setToursOpen] = useState(false);

  const handleToursPress = () => {
    setToursOpen((open) => !open);
  };

  const handleTourStart = () => {
    setToursOpen(false);
  };

  return (
    <LabContext.Provider value={lab}>
      <AnchorProvider anchor={runtime.anchor}>
        <TopBar toursOpen={toursOpen} onToursPress={handleToursPress} />
        {toursOpen ? <TourMenu onStart={handleTourStart} /> : null}
        <main
          className={clsx(PAGE_CLASS_NAME, "flex flex-col gap-6 pt-6 pb-28")}
        >
          <NoticeList />
          <TourPanel />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:grid-rows-[auto_1fr]">
            <div className="min-w-0 lg:col-start-1 lg:row-start-1">
              <AppWindow>
                <HarborApp />
              </AppWindow>
            </div>
            <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <InspectorPanel />
            </div>
            <div className="min-w-0 lg:col-start-1 lg:row-start-2">
              <MisbehavePanel />
            </div>
          </div>
        </main>
        <DevtoolsPointer />
        <AnchorDevtools />
      </AnchorProvider>
    </LabContext.Provider>
  );
};
