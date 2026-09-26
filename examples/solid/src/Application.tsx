import { AnchorDevtools } from "@priemskiyyy/anchor-devtools/solid";
import { AnchorProvider } from "@priemskiyyy/anchor-solid";
import type { Component } from "solid-js";
import { Show } from "solid-js";

import type { SessionLab } from "example-shared/lab/types/SessionLab";
import { PAGE_CLASS_NAME } from "example-shared/ui/styles/pageStyles";
import { AppWindow } from "src/components/Harbor/AppWindow";
import { MisbehaveList } from "src/components/Lab/MisbehaveList";
import { SessionCard } from "src/components/Lab/SessionCard";
import { TopBar } from "src/components/Lab/TopBar";
import { LabContext } from "src/context/LabContext";
import { useObservable } from "src/primitives/useObservable";

type ApplicationProps = { lab: SessionLab };

// Solid runs a component's body once, so a new runtime starts the tree over through a keyed Show.
export const Application: Component<ApplicationProps> = (props) => {
  const runtime = useObservable(props.lab.runtime);

  return (
    <LabContext.Provider value={props.lab}>
      <Show when={runtime()} keyed>
        {(current) => (
          <AnchorProvider anchor={current.anchor}>
            <TopBar />
            <main
              class={`${PAGE_CLASS_NAME} grid items-start gap-6 pt-6 pb-28 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]`}
            >
              <AppWindow />
              <div class="flex min-w-0 flex-col gap-6">
                <SessionCard />
                <MisbehaveList />
              </div>
            </main>
            <AnchorDevtools />
          </AnchorProvider>
        )}
      </Show>
    </LabContext.Provider>
  );
};
