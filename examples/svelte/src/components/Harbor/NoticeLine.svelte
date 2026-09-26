<script lang="ts">
  type Props = { notice: string | null };

  let { notice }: Props = $props();
</script>

{#if notice !== null}
  <p
    role="status"
    class="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/60 dark:text-rose-200"
  >
    {notice}
  </p>
{/if}
