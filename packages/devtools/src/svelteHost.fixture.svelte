<script lang="ts">
  import { untrack } from "svelte";
  import { createDevtoolsAttachment } from "src/svelte";
  import type { AnchorDevtoolsProps } from "src/types/AnchorDevtoolsProps";

  type Props = { options?: AnchorDevtoolsProps | undefined };

  const props: Props = $props();

  // Read once on purpose: an attachment is created with its options, or with none.
  const devtools = createDevtoolsAttachment(untrack(() => props.options));
</script>

<div {@attach devtools}></div>
