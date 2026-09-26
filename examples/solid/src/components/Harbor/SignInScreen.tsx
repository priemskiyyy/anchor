import type { Component } from "solid-js";
import { For, Show } from "solid-js";

import { describeEndResult } from "example-shared/formatting/describeEndResult";
import { buttonStyles } from "example-shared/ui/styles/buttonStyles";
import { monogramStyles } from "example-shared/ui/styles/monogramStyles";
import { PEOPLE, PERSON_IDS } from "example-shared/world/constants/people";
import { NoticeLine } from "src/components/Harbor/NoticeLine";
import { useLab } from "src/primitives/useLab";
import { useObservable } from "src/primitives/useObservable";

export const SignInScreen: Component = () => {
  const lab = useLab();
  const view = useObservable(lab.harbor.view);

  const getSigningIn = () => {
    const { busy } = view();

    return busy?.kind === "sign-in" ? busy.person : null;
  };

  return (
    <div class="mx-auto flex max-w-sm flex-col gap-5 py-2">
      <Show when={view().ended}>
        {(ended) => (
          <div
            role="status"
            aria-label="Sign-out result"
            class="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900/60"
          >
            <p class="font-semibold">You signed out.</p>
            <ul class="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
              <For each={describeEndResult(ended().result, ended().provider)}>
                {(line) => <li>{line}</li>}
              </For>
            </ul>
            <Show when={ended().result.navigation}>
              {(navigation) => (
                <Show
                  when={!ended().opened}
                  fallback={
                    <p class="text-emerald-700 dark:text-emerald-300">
                      You opened {ended().provider.label}'s logout page, so its
                      own session ended too.
                    </p>
                  }
                >
                  <div class="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={lab.harbor.openLogoutPage}
                      class={buttonStyles({ size: "small" })}
                    >
                      Open {ended().provider.label}'s logout page
                    </button>
                    <code class="font-mono text-xs break-all text-zinc-500">
                      {navigation().url}
                    </code>
                  </div>
                </Show>
              )}
            </Show>
          </div>
        )}
      </Show>
      <div class="flex flex-col gap-1.5 text-center">
        <h3 class="text-xl font-semibold tracking-tight">Sign in to Harbor</h3>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Your team's notes, in one place.
        </p>
      </div>
      <div class="flex flex-col gap-2">
        <For each={PERSON_IDS}>
          {(person) => (
            <button
              type="button"
              disabled={view().busy !== null}
              onClick={() => lab.harbor.signIn(person)}
              class={buttonStyles({ size: "regular" })}
            >
              <span
                aria-hidden="true"
                class={monogramStyles({
                  tone: PEOPLE[person].tone,
                  shape: "tile",
                })}
              >
                {PEOPLE[person].initials}
              </span>
              {getSigningIn() === person
                ? "Signing in…"
                : `Continue as ${PEOPLE[person].firstName}`}
            </button>
          )}
        </For>
      </div>
      <NoticeLine notice={view().notice} />
    </div>
  );
};
