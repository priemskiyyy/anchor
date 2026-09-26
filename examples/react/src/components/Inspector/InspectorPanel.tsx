import type React from "react";

import { SectionHeading } from "src/components/Common/SectionHeading";
import { ProviderCalls } from "src/components/Inspector/ProviderCalls";
import { SessionCard } from "src/components/Inspector/SessionCard";
import { TimelineList } from "src/components/Inspector/TimelineList";
import { WorkInFlight } from "src/components/Inspector/WorkInFlight";

export const InspectorPanel: React.FunctionComponent = () => (
  <section
    aria-labelledby="inspector-title"
    className="flex min-w-0 flex-col gap-3"
  >
    <SectionHeading
      id="inspector-title"
      title="What Anchor sees"
      shows="useSession() and anchor.diagnostics, live, beside the app."
    />
    <SessionCard />
    <WorkInFlight />
    <ProviderCalls />
    <TimelineList />
  </section>
);
