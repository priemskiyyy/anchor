<script lang="ts">
  import { createDevtoolsAttachment } from "@priemskiyyy/anchor-devtools/svelte";

  const devtools = createDevtoolsAttachment();
</script>

<div data-anchor-devtools {@attach devtools}></div>
