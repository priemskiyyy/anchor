import type { Component } from "solid-js";
import { Show } from "solid-js";

type NoticeLineProps = { notice: string | null };

export const NoticeLine: Component<NoticeLineProps> = (props) => (
  <Show when={props.notice}>
    {(notice) => (
      <p
        role="status"
        class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
      >
        {notice()}
      </p>
    )}
  </Show>
);
