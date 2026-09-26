import { useAnchor, useSession } from "@priemskiyyy/anchor-solid";
import type { Component } from "solid-js";
import { For, Show } from "solid-js";

import { STATUS_LABELS } from "example-shared/lab/constants/labels";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import {
  FIELD_LABEL_CLASS_NAME,
  FIELD_VALUE_CLASS_NAME,
} from "example-shared/ui/styles/fieldStyles";
import { getAcceptedSession } from "example-shared/utils/getAcceptedSession";
import { useLab } from "src/primitives/useLab";
import { useObservable } from "src/primitives/useObservable";

export const SessionCard: Component = () => {
  const state = useSession();
  const diagnostics = useObservable(useAnchor().diagnostics);
  const change = useObservable(useLab().sessionChange);

  const getFields = () => {
    const session = getAcceptedSession(state());

    return [
      { id: "status", label: "Status", value: STATUS_LABELS[state().status] },
      { id: "key", label: "Key", value: session?.key ?? "none" },
      {
        id: "generation",
        label: "Generation",
        value: `#${diagnostics().session.generation}`,
      },
      {
        id: "authority",
        label: "Authority",
        value: session?.principal.authority ?? "none",
      },
      {
        id: "subject",
        label: "Subject",
        value: session?.principal.subject ?? "none",
      },
    ];
  };

  return (
    <section
      aria-label="Session"
      class={`flex flex-col gap-3 p-4 ${CARD_CLASS_NAME}`}
    >
      <h2 class="text-lg font-semibold tracking-tight">What Anchor sees</h2>
      <dl class="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1.5">
        <For each={getFields()}>
          {(field) => (
            <>
              <dt id={`session-${field.id}`} class={FIELD_LABEL_CLASS_NAME}>
                {field.label}
              </dt>
              <dd
                aria-labelledby={`session-${field.id}`}
                class={FIELD_VALUE_CLASS_NAME}
              >
                {field.value}
              </dd>
            </>
          )}
        </For>
      </dl>
      <div role="status" aria-label="Key change">
        <Show when={change()} keyed>
          {(current) => (
            <p class="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 motion-safe:animate-flash dark:bg-blue-950/50 dark:text-blue-200">
              {current.reason}
            </p>
          )}
        </Show>
      </div>
    </section>
  );
};
