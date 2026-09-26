<script lang="ts">
  import { untrack } from "svelte";

  type Props = {
    callUtilities: () => unknown;
    runInEffect?: (() => unknown) | undefined;
  };

  const props: Props = $props();

  // Called once on purpose, while the component is created, as a utility must be.
  untrack(() => props.callUtilities());

  $effect(() => {
    props.runInEffect?.();
  });
</script>
