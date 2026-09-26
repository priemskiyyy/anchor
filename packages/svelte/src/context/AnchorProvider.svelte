<!--
@component Publishes one Anchor to the components below and does nothing else:
whoever constructed it starts and disposes it, so mounting starts nothing and
unmounting disposes nothing. Augment `Register` first, or TypeScript refuses an
Anchor typed by its own adapter.
@example `<AnchorProvider {anchor}><Application /></AnchorProvider>`
-->
<script lang="ts">
  import { setContext } from "svelte";
  import type { AnchorProviderProps } from "../types/AnchorProviderProps.js";
  import type { ReadableValue } from "../types/ReadableValue.js";
  import type { RegisteredAnchor } from "../types/Register.js";
  import { ANCHOR_CONTEXT } from "./AnchorContext.js";

  const props: AnchorProviderProps = $props();

  setContext(ANCHOR_CONTEXT, {
    get current() {
      return props.anchor;
    },
  } satisfies ReadableValue<RegisteredAnchor>);
</script>

{#if props.children}
  {@render props.children()}
{/if}
