import { useSession } from "@priemskiyyy/anchor-solid";
import type { Component } from "solid-js";
import { For } from "solid-js";

import { getMisbehaviorRows } from "example-shared/lab/getMisbehaviorRows";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { CARD_CLASS_NAME } from "example-shared/ui/styles/cardStyles";
import { useLab } from "src/primitives/useLab";
import { useObservable } from "src/primitives/useObservable";

export const MisbehaveList: Component = () => {
  const lab = useLab();
  const runtime = useObservable(lab.runtime);
  const world = useObservable(lab.world);
  const misbehaving = useObservable(lab.misbehaving);
  const status = useSession((state) => state.status);

  return (
    <section
      aria-labelledby="misbehave-title"
      class={`flex flex-col gap-3 p-4 ${CARD_CLASS_NAME}`}
    >
      <h2 id="misbehave-title" class="text-lg font-semibold tracking-tight">
        Make the provider misbehave
      </h2>
      <ul class="flex flex-col gap-2">
        <For each={getMisbehaviorRows(runtime().provider, status(), world())}>
          {(row) => (
            <li class="flex flex-col gap-1">
              <button
                type="button"
                role={row.misbehavior.kind === "switch" ? "switch" : undefined}
                aria-checked={
                  row.misbehavior.kind === "switch" ? row.on : undefined
                }
                aria-describedby={`misbehavior-${row.misbehavior.id}`}
                disabled={misbehaving() !== null || !row.available}
                onClick={() => lab.misbehave(row.misbehavior.id)}
                class={buttonStyles({ size: "block", pressed: row.on })}
              >
                {row.misbehavior.label}
              </button>
              <p
                id={`misbehavior-${row.misbehavior.id}`}
                class="text-sm text-zinc-600 dark:text-zinc-400"
              >
                {row.note}
              </p>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
};
